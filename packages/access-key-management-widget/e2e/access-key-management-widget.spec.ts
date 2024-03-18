import { test, expect } from '@playwright/test';
import mockTheme from '../test/mocks/mockTheme';
import { apiPaths } from '../src/lib/widget/api/apiPaths';
import {
  mockRoles,
  mockAccessKeys,
  mockAccessKeysWithNonEditable,
  mockNewAccessKey,
} from '../test/mocks/mockAccessKeys';
import rootMock from '../test/mocks/rootMock';
import createAccessKeyModalMock from '../test/mocks/createAccessKeyModalMock';
import createdAccessKeyModalMock from '../test/mocks/createdAccessKeyModalMock';
import deleteAccessKeyModalMock from '../test/mocks/deleteAccessKeyModalMock';
import activateAccessKeyModalMock from '../test/mocks/activateAccessKeyModalMock';
import deactivateAccessKeyModalMock from '../test/mocks/deactivateAccessKeyModalMock';

const configContent = {
  flows: {
    flow1: { version: 1 },
  },
  componentsVersion: '1.2.3',
};

const apiPath = (prop: 'accesskey' | 'tenant', path: string) =>
  `**/*${apiPaths[prop][path]}?tenant=*`;

const MODAL_TIMEOUT = 500;
const STATE_TIMEOUT = 1000;
const cleartext = 'aaaaaaaaaaaaaa';

test.describe('widget', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() =>
      window.localStorage.setItem(
        'base.ui.components.url',
        'http://localhost:8767/umd/index.js',
      ),
    );

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

    await page.goto('http://localhost:5557');
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

    await page.locator(`id=toggleButton`).last().click();
    await expect(
      page.locator(`text=${mockRoles.roles[0].name}`).last(),
    ).toBeVisible();
    await expect(
      page.locator(`text=${mockRoles.roles[1].name}`).last(),
    ).toBeVisible();
    await expect(
      page.locator(`text=${mockRoles.roles[2].name}`).last(),
    ).toBeVisible();

    await page.keyboard.press('Escape');

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

    const generatedAccessKeyNameInput = page.getByText('Generated Key');
    expect(await generatedAccessKeyNameInput.first().inputValue()).toEqual(
      cleartext,
    );

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
    await page.waitForTimeout(MODAL_TIMEOUT);

    const deactivateAccessKeyTrigger = await page
      .getByTestId('deactivate-access-keys-trigger')
      .first();
    const deactivateAccessKeyModalButton = await page
      .getByTestId('deactivate-access-keys-modal-submit')
      .first();

    // deactivate button initial state is disabled
    expect(deactivateAccessKeyTrigger).toBeDisabled();

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
    expect(deactivateAccessKeyModal).toBeVisible();

    const deactivateAccessKeyQ = page.locator('text=Deactivate 3 access keys?');
    expect(deactivateAccessKeyQ).toBeVisible();

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
    await page.waitForTimeout(MODAL_TIMEOUT);

    const activateAccessKeyTrigger = await page
      .getByTestId('activate-access-keys-trigger')
      .first();
    const activateAccessKeyModalButton = await page
      .getByTestId('activate-access-keys-modal-submit')
      .first();

    // activate button initial state is disabled
    expect(activateAccessKeyTrigger).toBeDisabled();

    // select all items
    await page.locator('descope-checkbox').first().click();

    await page.waitForTimeout(STATE_TIMEOUT);

    // activate button is enabled on selection
    expect(activateAccessKeyTrigger).toBeEnabled();

    // activate access keys
    await activateAccessKeyTrigger.click();

    const activateAccessKeyQ = page.locator('text=Activate 3 access keys?');
    expect(activateAccessKeyQ).toBeVisible();

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

    await page.route(apiPath('accesskey', 'search'), async (route) => {
      const { text } = route.request().postDataJSON();
      expect(text).toEqual('mockSearchString');
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ keys: [mockAccessKeys[1]] }),
      });
    });

    const searchInput = page
      .getByTestId('search-input')
      .locator('input')
      .first();

    // focus search input
    await searchInput.focus();

    // enter search string
    await searchInput.fill('mockSearchString');

    // only search results shown in grid
    await expect(
      page.locator(`text=${mockAccessKeys.keys[1]['name']}`).first(),
    ).toBeVisible();
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

    const deactivateAccessKeyTrigger = await page
      .getByTestId('deactivate-access-keys-trigger')
      .first();

    // deactivate button initial state is disabled
    expect(deactivateAccessKeyTrigger).toBeDisabled();

    // select all items
    await page.locator('descope-checkbox').first().click();

    await page.waitForTimeout(STATE_TIMEOUT);

    // deactivate button is disabled on selection
    expect(deactivateAccessKeyTrigger).toBeDisabled();
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

    const activateAccessKeyTrigger = await page
      .getByTestId('activate-access-keys-trigger')
      .first();

    // activate button initial state is disabled
    expect(activateAccessKeyTrigger).toBeDisabled();

    // select all items
    await page.locator('descope-checkbox').first().click();

    await page.waitForTimeout(STATE_TIMEOUT);

    // activate button is disabled on selection
    expect(activateAccessKeyTrigger).toBeDisabled();
  });
});
