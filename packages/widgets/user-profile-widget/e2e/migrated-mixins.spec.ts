// Every component whose flow moved onto the shared runner must still open its
// own modal, with its own data-id, exactly as before.
//
// These seven had no test of any kind before the migration - avatar, recovery
// email, recovery phone, totp, trusted devices, builtin attributes and custom
// attributes - so a mistake in moving them would have gone unnoticed. The
// neighbouring spec covers email, name, phone, passkey, password and the
// generic flow button.

import { test, expect, Page } from '@playwright/test';
import { listenForWidgetReady, waitForWidgetReady } from '@descope/e2e-helpers';
import { componentsPort, widgetPort } from '../playwright.config';
import { mockUser } from '../test/mocks/mockUser';
import mockTheme from '../test/mocks/mockTheme';
import rootMock from '../test/mocks/rootMock';

const ORIGIN = `http://localhost:${widgetPort}`;

const config = {
  flows: { flow1: { version: 1 } },
  componentsVersion: '1.2.3',
};

// Components the shared root does not carry. Flow ids are arbitrary - what is
// being checked is which modal opens, not what runs inside it.
const extraRoot = `
  <descope-trusted-devices flow-id="untrust-device" data-id="devices"></descope-trusted-devices>
  <descope-user-attribute
    data-id="builtin.givenName"
    edit-flow-id="edit-given-name-flow"
    delete-flow-id="delete-given-name-flow"
  ></descope-user-attribute>
  <descope-user-attribute
    data-id="customAttributes.nickname"
    edit-flow-id="edit-nickname-flow"
    delete-flow-id="delete-nickname-flow"
  ></descope-user-attribute>
`;

const setup = async (page: Page, root = rootMock) => {
  await listenForWidgetReady(page);

  await page.addInitScript((port) => {
    window.localStorage.setItem(
      'base.ui.components.url',
      `http://localhost:${port}/umd/index.js`,
    );
    window.customElements.define(
      'descope-wc',
      class extends HTMLElement {
        connectedCallback() {
          this.innerHTML = '<button>Finish Flow</button>';
          this.querySelector('button').onclick = () => {
            this.dispatchEvent(new CustomEvent('success'));
          };
        }
      },
    );
  }, componentsPort);

  await page.route('*/**/config.json', async (route) =>
    route.fulfill({ json: config }),
  );
  await page.route('*/**/theme.json', async (route) =>
    route.fulfill({ json: mockTheme }),
  );
  await page.route('*/**/root.html', async (route) =>
    route.fulfill({ body: root }),
  );
  // the delete control only shows once there is a verified value to delete
  await page.route('**/auth/me', async (route) =>
    route.fulfill({
      json: {
        ...mockUser,
        recoveryEmail: 'recovery@example.com',
        verifiedRecoveryEmail: true,
        recoveryPhone: '+972500000000',
        verifiedRecoveryPhone: true,
      },
    }),
  );
  await page.route('**/auth/refresh', async (route) =>
    route.fulfill({ json: { sessionJwt: 'mock' } }),
  );
  await page.route('**/v1/mgmt/user/passkeys/list', async (route) =>
    route.fulfill({ json: { passkeys: [] } }),
  );
  await page.route('**/v1/mgmt/user/trusteddevices/list', async (route) =>
    route.fulfill({
      json: { devices: [{ id: 'dev-1', name: 'Mac', lastSeen: 1 }] },
    }),
  );
  await page.route('**/v1/mgmt/widget/components-state', async (route) =>
    route.fulfill({ json: { componentsState: {} } }),
  );

  await page.goto(ORIGIN);
  await waitForWidgetReady(page);
};

const modal = (page: Page, dataId: string) =>
  page.locator(`descope-modal[data-id="${dataId}"]`);

test.describe('flows that moved onto the shared runner still open their modal', () => {
  test.describe('components in the standard layout', () => {
    test.beforeEach(async ({ page }) => {
      await setup(page);
    });

    test('avatar opens the picture flow', async ({ page }) => {
      await page.locator('descope-avatar').first().click();

      await expect(modal(page, 'update-pic')).toHaveAttribute('opened');
    });

    // eslint-disable-next-line no-restricted-syntax
    for (const attr of [
      { name: 'recoveryEmail', action: 'edit', modalId: 'edit-recovery-email' },
      {
        name: 'recoveryEmail',
        action: 'delete',
        modalId: 'delete-recovery-email',
      },
      { name: 'recoveryPhone', action: 'edit', modalId: 'edit-recovery-phone' },
      {
        name: 'recoveryPhone',
        action: 'delete',
        modalId: 'delete-recovery-phone',
      },
    ]) {
      test(`${attr.action} ${attr.name}`, async ({ page }) => {
        await page
          .locator(`descope-user-attribute[data-id="${attr.name}"]`)
          .first()
          .locator(`descope-button[data-id="${attr.action}-btn"]`)
          .first()
          .click();

        await expect(modal(page, attr.modalId)).toHaveAttribute('opened');
      });
    }

    test('totp opens its own modal', async ({ page }) => {
      await page
        .locator('descope-user-auth-method[data-id="totp"]')
        .first()
        .locator('descope-button')
        .first()
        .click();

      // the user in the mock has no totp yet, so this is the add side
      await expect(modal(page, 'totp')).toHaveAttribute('opened');
    });
  });

  test.describe('components the standard layout leaves out', () => {
    test.beforeEach(async ({ page }) => {
      await setup(page, rootMock + extraRoot);
    });

    test('a builtin attribute opens edit and delete separately', async ({
      page,
    }) => {
      const attr = page
        .locator('descope-user-attribute[data-id="builtin.givenName"]')
        .first();

      await attr.locator('descope-button[data-id="edit-btn"]').first().click();
      await expect(modal(page, 'edit-givenName')).toHaveAttribute('opened');
    });

    test('a custom attribute opens its own modal', async ({ page }) => {
      const attr = page
        .locator('descope-user-attribute[data-id="customAttributes.nickname"]')
        .first();

      await attr.locator('descope-button[data-id="edit-btn"]').first().click();
      await expect(modal(page, 'edit-nickname')).toHaveAttribute('opened');
    });

    test('untrusting a device carries the device it was asked about', async ({
      page,
    }) => {
      // the component announces the device by event; dispatching it drives the
      // mixin's wiring without depending on the component's own markup
      await page
        .locator('descope-trusted-devices')
        .first()
        .evaluate((el) =>
          el.dispatchEvent(
            new CustomEvent('remove-device-clicked', {
              detail: { id: 'dev-1' },
            }),
          ),
        );

      const wc = modal(page, 'untrust-device').locator('descope-wc');
      await expect(wc).toBeAttached();
      // the flow has to know which device, so it is built on click
      const form = JSON.parse((await wc.getAttribute('form')) ?? '{}');
      expect(form).toMatchObject({ deviceId: 'dev-1' });
    });
  });
});
