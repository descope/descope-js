import { test, expect } from '@playwright/test';
import { componentsPort, widgetPort } from '../playwright.config';
import { mockUser } from '../test/mocks/mockUser';
import mockTheme from '../test/mocks/mockTheme';
import rootMock from '../test/mocks/rootMock';

// The flows referenced by rootMock. Declared with a startScreenId whose screen holds a
// polling element: rendering such a screen fires the polling interaction, which on a
// start screen calls POST /v1/flow/start. A widget pre-renders its flows into closed
// modals, so that would run the flow before the user opened anything.
const FLOW_IDS = [
  'add-passkey-flow',
  'remove-passkey-flow',
  'test-widget',
  'update-pic',
  'user-profile-delete-recovery-email',
  'user-profile-delete-recovery-phone',
  'user-profile-reset-totp',
  'user-profile-set-recovery-email',
  'user-profile-set-recovery-phone',
];

const configContent = {
  flows: Object.fromEntries(
    FLOW_IDS.map((id) => [id, { version: 1, startScreenId: 'screen-1' }]),
  ),
  componentsVersion: '1.2.3',
};

const STATE_TIMEOUT = 2000;

test.describe('early flow execution (issue 17399)', () => {
  let started: string[];

  test.beforeEach(async ({ page }) => {
    started = [];

    // NOTE: unlike user-profile-widget.spec.ts, this suite does NOT stub descope-wc.
    // The bug is that mounting the real component starts the flow, so the real
    // component has to run.
    await page.addInitScript((port) => {
      window.localStorage.setItem(
        'base.ui.components.url',
        `http://localhost:${port}/umd/index.js`,
      );
    }, componentsPort);

    await page.route('*/**/config.json', async (route) =>
      route.fulfill({ json: configContent }),
    );

    await page.route('*/**/theme.json', async (route) =>
      route.fulfill({ json: mockTheme }),
    );

    await page.route('*/**/root.html', async (route) =>
      route.fulfill({ body: rootMock }),
    );

    await page.route('*/**/screen-1.html', async (route) =>
      route.fulfill({ body: '<div data-type="polling">waiting</div>' }),
    );

    await page.route('**/auth/me', async (route) =>
      route.fulfill({ json: mockUser }),
    );

    await page.route('**/v1/mgmt/user/passkeys/list', async (route) =>
      route.fulfill({ json: { passkeys: [] } }),
    );

    await page.route('**/v1/mgmt/widget/components-state', async (route) =>
      route.fulfill({ json: { componentsState: {} } }),
    );

    // count every flow execution. answering "completed" keeps the mock cheap - no
    // screen fetch follows - and mirrors an action-only flow that finishes server side.
    await page.route('**/v1/flow/start', async (route) => {
      const { flowId } = JSON.parse(route.request().postData() ?? '{}');
      started.push(flowId);
      await route.fulfill({ json: { status: 'completed' } });
    });

    await page.goto(`http://localhost:${widgetPort}`);
    await page.waitForTimeout(STATE_TIMEOUT);
  });

  test('runs no flow before the user presses anything', async () => {
    // eslint-disable-next-line no-console
    console.log(
      `flows executed on render: ${started.length}`,
      JSON.stringify(started),
    );

    expect(started).toEqual([]);
  });

  test('runs exactly one flow when one button is pressed', async ({ page }) => {
    started.length = 0;

    const editBtn = page
      .locator('descope-user-attribute[data-id="email"]')
      .first()
      .locator('descope-button[data-id="edit-btn"]')
      .first();

    await editBtn.click();

    // assert the modal opened before the start, so a failure says which step was missed
    await expect(
      page.locator('descope-modal[data-id="edit-email"]'),
    ).toHaveAttribute('opened', 'true');

    // being visible is what triggers polling, which is what starts the flow - a render
    // plus a request, so poll for it rather than guess a delay
    await expect.poll(() => started.length, { timeout: 30000 }).toBe(1);
  });
});
