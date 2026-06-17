import { test, expect } from '@playwright/test';
import { componentsPort, widgetPort } from '../playwright.config';
import mockTheme from '../test/mocks/mockTheme';
import { apiPaths } from '../src/lib/widget/api/apiPaths';
import {
  mockRoles,
  mockAccessKeys,
  mockAccessKeysWithNonEditable,
  mockAccessKeysWithExpired,
  mockNewAccessKey,
} from '../test/mocks/mockAccessKeys';
import rootMock from '../test/mocks/rootMock';
import createAccessKeyModalMock from '../test/mocks/createAccessKeyModalMock';
import createdAccessKeyModalMock from '../test/mocks/createdAccessKeyModalMock';
import deleteAccessKeyModalMock from '../test/mocks/deleteAccessKeyModalMock';
import activateAccessKeyModalMock from '../test/mocks/activateAccessKeyModalMock';
import deactivateAccessKeyModalMock from '../test/mocks/deactivateAccessKeyModalMock';
import rotateAccessKeyModalMock from '../test/mocks/rotateAccessKeyModalMock';
import rotatedAccessKeyModalMock from '../test/mocks/rotatedAccessKeyModalMock';

const configContent = {
  flows: {
    flow1: { version: 1 },
  },
  componentsVersion: '1.2.3',
};

const apiPath = (prop: 'accesskey' | 'tenant', path: string) =>
  `**/*${apiPaths[prop][path]}?tenant=*`;

const MODAL_TIMEOUT = 500;
const STATE_TIMEOUT = 2000;
const cleartext = 'aaaaaaaaaaaaaa';

// Reads `.value` from a custom element matching `selector` anywhere in the
// page, walking shadow roots. Needed because descope-text-field isn't a native
// <input>, so playwright's locator.inputValue() doesn't work on it.
const readShadowDomElementValue = (
  page: import('@playwright/test').Page,
  selector: string,
): Promise<string | undefined> =>
  page.evaluate((sel: string) => {
    function findInShadow(root: any, s: string): any {
      if (!root) return null;
      const direct = root.querySelector?.(s);
      if (direct) return direct;
      const all = root.querySelectorAll?.('*') || [];
      for (const el of all) {
        if (el.shadowRoot) {
          const found = findInShadow(el.shadowRoot, s);
          if (found) return found;
        }
      }
      return null;
    }
    return findInShadow(document, sel)?.value;
  }, selector);

test.describe('widget', () => {
  test.beforeEach(async ({ page }) => {
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

    await page.route('*/**/create-access-key-modal.html', async (route) =>
      route.fulfill({ body: createAccessKeyModalMock }),
    );

    await page.route('*/**/created-access-key-modal.html', async (route) =>
      route.fulfill({ body: createdAccessKeyModalMock }),
    );

    await page.route('*/**/delete-access-keys-modal.html', async (route) =>
      route.fulfill({ body: deleteAccessKeyModalMock }),
    );

    await page.route('*/**/activate-access-keys-modal.html', async (route) =>
      route.fulfill({ body: activateAccessKeyModalMock }),
    );

    await page.route('*/**/deactivate-access-keys-modal.html', async (route) =>
      route.fulfill({ body: deactivateAccessKeyModalMock }),
    );

    await page.route('*/**/rotate-access-key-modal.html', async (route) =>
      route.fulfill({ body: rotateAccessKeyModalMock }),
    );

    await page.route('*/**/rotated-access-key-modal.html', async (route) =>
      route.fulfill({ body: rotatedAccessKeyModalMock }),
    );

    await page.route(apiPath('accesskey', 'create'), async (route) =>
      route.fulfill({ json: { key: mockNewAccessKey, cleartext } }),
    );

    await page.route(apiPath('tenant', 'roles'), async (route) =>
      route.fulfill({ json: mockRoles }),
    );

    await page.route(apiPath('accesskey', 'search'), async (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ keys: mockAccessKeys.keys }),
      }),
    );

    await page.route(apiPath('accesskey', 'deleteBatch'), async (route) =>
      route.fulfill({ json: { tenant: 'mockTenant' } }),
    );

    await page.route(apiPath('accesskey', 'activate'), async (route) =>
      route.fulfill({ json: { tenant: 'mockTenant' } }),
    );

    await page.route(apiPath('accesskey', 'deactivate'), async (route) =>
      route.fulfill({ json: { tenant: 'mockTenant' } }),
    );

    await page.route(apiPath('accesskey', 'rotate'), async (route) =>
      route.fulfill({
        json: { key: mockAccessKeys.keys[0], cleartext },
      }),
    );

    await page.route('**/auth/me', async (route) =>
      route.fulfill({
        json: {
          userTenants: [
            {
              tenantId: 'tid',
              roleNames: ['Tenant Admin'],
            },
          ],
        },
      }),
    );

    await page.goto(`http://localhost:${widgetPort}`, {
      waitUntil: 'networkidle',
    });
  });

  test('access keys table', async ({ page }) => {
    await expect(
      page.locator(`text=${mockAccessKeys.keys[0]['name']}`).first(),
    ).toBeVisible();

    await expect(
      page.locator(`text=${mockAccessKeys.keys[1]['name']}`).first(),
    ).toBeVisible();

    await expect(
      page.locator(`text=${mockAccessKeys.keys[2]['name']}`).first(),
    ).toBeVisible();
  });

  test('create access key', async ({ page, browserName }) => {
    await page.waitForTimeout(MODAL_TIMEOUT);

    const openAddAccessKeyModalButton = page
      .getByTestId('create-access-key-trigger')
      .first();

    // open add access key modal
    await openAddAccessKeyModalButton.click();

    await page.waitForTimeout(MODAL_TIMEOUT);

    const expirationInput = page.getByText('Expiration');
    expect(await expirationInput.last().inputValue()).toEqual('30 Days');

    // submit name
    const createAccessKeyNameInput = page.getByText('Name');
    await createAccessKeyNameInput.last().fill('some access key name');

    await page.locator(`id=toggleButton`).nth(-2).click();
    await expect(
      page.locator(`text=${mockRoles.roles[0].name}`).last(),
    ).toBeVisible();
    await expect(
      page.locator(`text=${mockRoles.roles[1].name}`).last(),
    ).toBeVisible();
    await expect(
      page.locator(`text=${mockRoles.roles[2].name}`).last(),
    ).toBeVisible();

    await page.locator(`id=toggleButton`).nth(-2).click();

    // click modal create button
    const createAccessKeyButton = page
      .locator('descope-button')
      .filter({ hasText: 'Create' })
      .getByTestId('create-access-key-modal-submit')
      .last();

    await expect(createAccessKeyButton).toBeVisible();

    await createAccessKeyButton.click();

    // show notification
    await expect(
      page.locator('text=Access Key created successfully'),
    ).toBeVisible();

    const createdAccessKeyValue = await readShadowDomElementValue(
      page,
      '[data-testid="created-access-key-input"]',
    );
    expect(createdAccessKeyValue).toEqual(cleartext);

    // click modal create button
    const closeCreatedAccessKeyButton = page
      .locator('descope-button')
      .filter({ hasText: 'Copy to clipboard & close' })
      .getByTestId('created-access-key-modal-close')
      .first();
    await closeCreatedAccessKeyButton.click();

    // update grid items
    await expect(
      page.locator(`text=${mockNewAccessKey['name']}`).first(),
    ).toBeVisible();

    if (browserName === 'chromium') {
      const clipboardContent = await page.evaluate(
        'navigator.clipboard.readText()',
      );
      expect(clipboardContent).toEqual(cleartext);
    }
  });

  test('delete access keys', async ({ page }) => {
    const deleteAccessKeyTrigger = await page
      .getByTestId('delete-access-keys-trigger')
      .first();
    const deleteAccessKeyModalButton = await page
      .getByTestId('delete-access-keys-modal-submit')
      .first();

    await page.waitForTimeout(STATE_TIMEOUT);

    // delete button initial state is disabled
    expect(deleteAccessKeyTrigger).toBeDisabled();

    // select all items
    await page.locator('descope-checkbox').first().click();

    await page.waitForTimeout(MODAL_TIMEOUT);

    // delete button is enabled on selection
    expect(deleteAccessKeyTrigger).toBeEnabled();

    // delete access keys
    await deleteAccessKeyTrigger.click();

    // show delete access keys modal
    const deleteAccessKeyModal = page.locator('text=Delete Access Keys');
    expect(deleteAccessKeyModal).toBeVisible();

    // click modal delete button
    await deleteAccessKeyModalButton.click();

    // wait for modal to close
    await page.waitForTimeout(MODAL_TIMEOUT);

    // delete modal closed
    await expect(page.locator('Delete Access Keys')).toBeHidden();

    // show notification
    await expect(
      page.locator(
        `text=${mockAccessKeys.keys.length} access keys deleted successfully`,
      ),
    ).toBeVisible();

    // update grid items
    await expect(page.locator('descope-grid').locator('#items')).toBeEmpty();
  });

  test('deactivate access keys', async ({ page }) => {
    await page.waitForTimeout(STATE_TIMEOUT);

    const deactivateAccessKeyTrigger = await page
      .getByTestId('deactivate-access-keys-trigger')
      .first();
    const deactivateAccessKeyModalButton = await page
      .getByTestId('deactivate-access-keys-modal-submit')
      .first();

    // deactivate button initial state is disabled
    await expect(deactivateAccessKeyTrigger).toBeDisabled();

    // select all items
    await page.locator('descope-checkbox').first().click();

    await page.waitForTimeout(MODAL_TIMEOUT);

    // deactivate button is enabled on selection
    expect(deactivateAccessKeyTrigger).toBeEnabled();

    // deactivate access keys
    await deactivateAccessKeyTrigger.click();

    // show deactivate access keys modal
    const deactivateAccessKeyModal = page.locator(
      'text=Deactivate Access Keys',
    );
    await expect(deactivateAccessKeyModal).toBeVisible();

    const deactivateAccessKeyQ = page.locator('text=Deactivate 3 access keys?');
    await expect(deactivateAccessKeyQ).toBeVisible();

    // click modal deactivate button
    await deactivateAccessKeyModalButton.click();

    // wait for modal to close
    await page.waitForTimeout(MODAL_TIMEOUT);

    // deactivate modal closed
    await expect(page.locator('Deactivate Access Keys')).toBeHidden();

    // show notification
    await expect(
      page.locator(
        `text=${mockAccessKeys.keys.length} access keys deactivated successfully`,
      ),
    ).toBeVisible();

    // update grid items
    await expect(page.locator('descope-grid').locator('#items')).toBeEmpty();
  });

  test('activate access keys', async ({ page }) => {
    await page.waitForTimeout(STATE_TIMEOUT);

    const activateAccessKeyTrigger = page
      .getByTestId('activate-access-keys-trigger')
      .first();
    const activateAccessKeyModalButton = page
      .getByTestId('activate-access-keys-modal-submit')
      .first();

    // wait for elements to be visible first
    await activateAccessKeyTrigger.waitFor({ state: 'visible' });

    // activate button initial state is disabled
    await expect(activateAccessKeyTrigger).toBeDisabled();

    // select all items
    await page.locator('descope-checkbox').first().click();

    await page.waitForTimeout(STATE_TIMEOUT);

    // activate button is enabled on selection
    await expect(activateAccessKeyTrigger).toBeEnabled();

    // activate access keys
    await activateAccessKeyTrigger.click();

    const activateAccessKeyQ = page.locator('text=Activate 3 access keys?');
    await expect(activateAccessKeyQ).toBeVisible();

    // click modal activate button
    await activateAccessKeyModalButton.click();

    // wait for modal to close
    await page.waitForTimeout(MODAL_TIMEOUT);

    // activate modal closed
    await expect(page.locator('Activate Access Keys')).toBeHidden();

    // show notification
    await expect(
      page.locator(
        `text=${mockAccessKeys.keys.length} access keys activated successfully`,
      ),
    ).toBeVisible();

    // update grid items
    await expect(page.locator('descope-grid').locator('#items')).toBeEmpty();
  });

  test('search access keys', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Handle all search requests (initial empty-text mount call AND the user-typed
    // call). Branch on `text` to filter — asserting inside the handler would race
    // with the initial mount call where text is "".
    await page.route(apiPath('accesskey', 'search'), async (route) => {
      const { text } = route.request().postDataJSON();
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          keys:
            text === 'mockSearchString'
              ? [mockAccessKeys.keys[1]]
              : mockAccessKeys.keys,
        }),
      });
    });

    const searchInput = page
      .getByTestId('search-input')
      .locator('input')
      .first();

    await searchInput.waitFor({ state: 'visible' });

    // focus search input
    await searchInput.focus();

    // Trigger search by typing (simulates user behavior more accurately)
    await searchInput.fill('mockSearchString');

    // Wait for a search request whose body carries the typed text. This also
    // verifies the wiring (input → request body) — replaces the assertion that
    // used to live inside the route handler.
    await page.waitForRequest((req) => {
      if (!req.url().includes('/accesskey/search')) return false;
      try {
        return req.postDataJSON()?.text === 'mockSearchString';
      } catch {
        return false;
      }
    });

    // only search results shown in grid - wait longer for UI to update
    await expect(
      page.locator(`text=${mockAccessKeys.keys[1].name}`).first(),
    ).toBeVisible({ timeout: 10000 });

    await expect(
      page.locator(`text=${mockAccessKeys.keys[1].boundUserId}`).first(),
    ).toBeVisible({ timeout: 10000 });

    // The unfiltered key is no longer in the grid — proves the filter actually
    // ran on the typed text (not just that the response renders).
    await expect(
      page.locator(`text=${mockAccessKeys.keys[0].name}`).first(),
    ).toBeHidden({ timeout: 10000 });
  });

  test('close notification', async ({ page }) => {
    const deleteAccessKeyTrigger = page
      .getByTestId('delete-access-keys-trigger')
      .first();
    const deleteAccessKeyModalButton = page
      .getByTestId('delete-access-keys-modal-submit')
      .first();

    // select all items
    await page.locator('descope-checkbox').first().click();

    // delete access keys
    await deleteAccessKeyTrigger.click();

    // show delete access keys modal
    const deleteAccessKeyModal = page.locator('text=Delete Access Keys');
    expect(deleteAccessKeyModal).toBeVisible();

    // click modal delete button
    await deleteAccessKeyModalButton.click();

    // wait for modal to close
    await page.waitForTimeout(MODAL_TIMEOUT);

    // show notification
    await expect(
      page.locator(
        `text=${mockAccessKeys.keys.length} access keys deleted successfully`,
      ),
    ).toBeVisible();

    // click close button
    await page.getByRole('img').nth(1).click();

    // notification closed
    await expect(
      page.locator(
        `text=${mockAccessKeys.keys.length} access keys deleted successfully`,
      ),
    ).toBeHidden();
  });

  test('deactivate access keys for non editable key', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.route(apiPath('accesskey', 'search'), async (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ keys: mockAccessKeysWithNonEditable.keys }),
      }),
    );
    page.reload();
    await page.waitForLoadState('networkidle');

    await page.waitForTimeout(STATE_TIMEOUT);

    const deactivateAccessKeyTrigger = page
      .getByTestId('deactivate-access-keys-trigger')
      .first();

    // wait for element to be visible first
    await deactivateAccessKeyTrigger.waitFor({ state: 'visible' });

    // deactivate button initial state is disabled
    await expect(deactivateAccessKeyTrigger).toBeDisabled();

    // select all items
    await page.locator('descope-checkbox').first().click();

    await page.waitForTimeout(STATE_TIMEOUT);

    // deactivate button is disabled on selection
    await expect(deactivateAccessKeyTrigger).toBeDisabled();
  });

  test('activate access keys for non editable key', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.route(apiPath('accesskey', 'search'), async (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ keys: mockAccessKeysWithNonEditable.keys }),
      }),
    );
    page.reload();
    await page.waitForLoadState('networkidle');

    await page.waitForTimeout(STATE_TIMEOUT);

    const activateAccessKeyTrigger = page
      .getByTestId('activate-access-keys-trigger')
      .first();

    // wait for element to be visible first
    await activateAccessKeyTrigger.waitFor({ state: 'visible' });

    // activate button initial state is disabled
    await expect(activateAccessKeyTrigger).toBeDisabled();

    // select all items
    await page.locator('descope-checkbox').first().click();

    await page.waitForTimeout(STATE_TIMEOUT);

    // activate button is disabled on selection
    await expect(activateAccessKeyTrigger).toBeDisabled();
  });

  test('activate button is disabled for expired keys', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.route(apiPath('accesskey', 'search'), async (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ keys: mockAccessKeysWithExpired.keys }),
      }),
    );
    page.reload();
    await page.waitForLoadState('networkidle');

    await page.waitForTimeout(STATE_TIMEOUT);

    const activateAccessKeyTrigger = page
      .getByTestId('activate-access-keys-trigger')
      .first();

    await activateAccessKeyTrigger.waitFor({ state: 'visible' });

    // activate button initial state is disabled
    await expect(activateAccessKeyTrigger).toBeDisabled();

    // select all items
    await page.locator('descope-checkbox').first().click();

    await page.waitForTimeout(STATE_TIMEOUT);

    // activate button remains disabled for expired keys
    await expect(activateAccessKeyTrigger).toBeDisabled();
  });

  test('deactivate button is disabled for expired keys', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.route(apiPath('accesskey', 'search'), async (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ keys: mockAccessKeysWithExpired.keys }),
      }),
    );
    page.reload();
    await page.waitForLoadState('networkidle');

    await page.waitForTimeout(STATE_TIMEOUT);

    const deactivateAccessKeyTrigger = page
      .getByTestId('deactivate-access-keys-trigger')
      .first();

    await deactivateAccessKeyTrigger.waitFor({ state: 'visible' });

    // deactivate button initial state is disabled
    await expect(deactivateAccessKeyTrigger).toBeDisabled();

    // select all items
    await page.locator('descope-checkbox').first().click();

    await page.waitForTimeout(STATE_TIMEOUT);

    // deactivate button remains disabled for expired keys
    await expect(deactivateAccessKeyTrigger).toBeDisabled();
  });

  test('rotate access key', async ({ page, browserName }) => {
    const rotatedCleartext = 'rotated-cleartext-value';
    await page.route(apiPath('accesskey', 'rotate'), async (route) =>
      route.fulfill({
        json: {
          key: mockAccessKeys.keys[0],
          cleartext: rotatedCleartext,
        },
      }),
    );

    await page.waitForTimeout(STATE_TIMEOUT);

    const rotateAccessKeyTrigger = page
      .getByTestId('rotate-access-keys-trigger')
      .first();
    const rotateModalSubmitButton = page
      .getByTestId('rotate-access-key-modal-submit')
      .first();

    await rotateAccessKeyTrigger.waitFor({ state: 'visible' });

    // rotate button initial state is disabled
    await expect(rotateAccessKeyTrigger).toBeDisabled();

    // select a single row (.first() is the select-all header checkbox; .nth(1)
    // is the first row's checkbox)
    await page.locator('descope-checkbox').nth(1).click();

    await page.waitForTimeout(MODAL_TIMEOUT);

    // rotate button is enabled when exactly one active key is selected
    await expect(rotateAccessKeyTrigger).toBeEnabled();

    // click rotate — opens the confirm modal first
    await rotateAccessKeyTrigger.click();

    // confirm modal renders with the rotate title + selected key name in the
    // dynamic body
    const rotateConfirmTitle = page.locator('text=Rotate access key').first();
    await expect(rotateConfirmTitle).toBeVisible();
    await expect(
      page.locator(`text=Rotate ${mockAccessKeys.keys[0].name}?`),
    ).toBeVisible();

    // confirm — fires the rotate API and opens the reveal modal
    await rotateModalSubmitButton.click();

    // success notification
    await expect(
      page.locator('text=Access key rotated successfully'),
    ).toBeVisible();

    // reveal modal now has the rotate-specific title
    await expect(page.locator('text=Access key secret rotated')).toBeVisible();

    const rotatedAccessKeyValue = await readShadowDomElementValue(
      page,
      '[data-testid="rotated-access-key-input"]',
    );
    expect(rotatedAccessKeyValue).toEqual(rotatedCleartext);

    // close the reveal modal — exercises the clipboard copy
    const closeRevealButton = page
      .getByTestId('rotated-access-key-modal-close')
      .first();
    await closeRevealButton.click();

    if (browserName === 'chromium') {
      const clipboardContent = await page.evaluate(
        'navigator.clipboard.readText()',
      );
      expect(clipboardContent).toEqual(rotatedCleartext);
    }
  });

  test('rotate keeps the reveal modal closed when the API rejects', async ({
    page,
  }) => {
    // Override the default rotate route to return a server error
    await page.route(apiPath('accesskey', 'rotate'), async (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          errorCode: 'E000000',
          errorDescription: 'simulated server error',
        }),
      }),
    );

    await page.waitForTimeout(STATE_TIMEOUT);

    const rotateAccessKeyTrigger = page
      .getByTestId('rotate-access-keys-trigger')
      .first();
    const rotateModalSubmitButton = page
      .getByTestId('rotate-access-key-modal-submit')
      .first();

    await rotateAccessKeyTrigger.waitFor({ state: 'visible' });

    // pick a row + open the confirm modal
    await page.locator('descope-checkbox').nth(1).click();
    await page.waitForTimeout(MODAL_TIMEOUT);
    await rotateAccessKeyTrigger.click();

    await expect(page.locator('text=Rotate access key').first()).toBeVisible();

    // submit → API rejects → no reveal modal, error notification surfaces
    await rotateModalSubmitButton.click();
    await page.waitForTimeout(MODAL_TIMEOUT);

    // The "secret isn't lost" invariant: reveal modal must NOT open on failure,
    // otherwise the user would see an empty/stale cleartext input.
    await expect(page.locator('text=Access key secret rotated')).toBeHidden();

    // Error notification surfaced via the withNotifications helper.
    await expect(
      page.locator('text=Failed to rotate access key').first(),
    ).toBeVisible();
  });

  test('rotate confirm modal can be cancelled without firing the API', async ({
    page,
  }) => {
    let rotateCalls = 0;
    await page.route(apiPath('accesskey', 'rotate'), async (route) => {
      rotateCalls += 1;
      return route.fulfill({
        json: {
          key: mockAccessKeys.keys[0],
          cleartext: 'should-not-be-shown',
        },
      });
    });

    await page.waitForTimeout(STATE_TIMEOUT);

    const rotateAccessKeyTrigger = page
      .getByTestId('rotate-access-keys-trigger')
      .first();
    const rotateModalCancelButton = page
      .getByTestId('rotate-access-key-modal-cancel')
      .first();

    await rotateAccessKeyTrigger.waitFor({ state: 'visible' });

    // pick a row + open the confirm modal
    await page.locator('descope-checkbox').nth(1).click();
    await page.waitForTimeout(MODAL_TIMEOUT);
    await rotateAccessKeyTrigger.click();

    await expect(page.locator('text=Rotate access key').first()).toBeVisible();

    // cancel → modal closes, no API call, no reveal
    await rotateModalCancelButton.click();
    await page.waitForTimeout(MODAL_TIMEOUT);

    expect(rotateCalls).toBe(0);
    await expect(page.locator('text=Access key secret rotated')).toBeHidden();
  });

  test('rotate button is disabled when multiple keys are selected', async ({
    page,
  }) => {
    await page.waitForTimeout(STATE_TIMEOUT);

    const rotateAccessKeyTrigger = page
      .getByTestId('rotate-access-keys-trigger')
      .first();

    await rotateAccessKeyTrigger.waitFor({ state: 'visible' });

    // rotate button initial state is disabled
    await expect(rotateAccessKeyTrigger).toBeDisabled();

    // select-all checkbox (selects all 3 keys)
    await page.locator('descope-checkbox').first().click();

    await page.waitForTimeout(STATE_TIMEOUT);

    // rotate requires a single selection — stays disabled with multi-select
    await expect(rotateAccessKeyTrigger).toBeDisabled();
  });

  test('rotate button is disabled for expired keys', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.route(apiPath('accesskey', 'search'), async (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ keys: mockAccessKeysWithExpired.keys }),
      }),
    );
    page.reload();
    await page.waitForLoadState('networkidle');

    await page.waitForTimeout(STATE_TIMEOUT);

    const rotateAccessKeyTrigger = page
      .getByTestId('rotate-access-keys-trigger')
      .first();

    await rotateAccessKeyTrigger.waitFor({ state: 'visible' });

    await expect(rotateAccessKeyTrigger).toBeDisabled();

    // select first row's checkbox
    await page.locator('descope-checkbox').nth(1).click();

    await page.waitForTimeout(STATE_TIMEOUT);

    // rotate stays disabled for expired keys
    await expect(rotateAccessKeyTrigger).toBeDisabled();
  });

  test('delete button is still enabled for expired keys', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.route(apiPath('accesskey', 'search'), async (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ keys: mockAccessKeysWithExpired.keys }),
      }),
    );
    page.reload();
    await page.waitForLoadState('networkidle');

    await page.waitForTimeout(STATE_TIMEOUT);

    const deleteAccessKeyTrigger = page
      .getByTestId('delete-access-keys-trigger')
      .first();

    await deleteAccessKeyTrigger.waitFor({ state: 'visible' });

    // delete button initial state is disabled
    await expect(deleteAccessKeyTrigger).toBeDisabled();

    // select all items
    await page.locator('descope-checkbox').first().click();

    await page.waitForTimeout(STATE_TIMEOUT);

    // delete button is enabled even for expired keys
    await expect(deleteAccessKeyTrigger).toBeEnabled();
  });
});
