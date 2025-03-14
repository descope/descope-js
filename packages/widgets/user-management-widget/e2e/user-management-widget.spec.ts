import { test, expect, Page } from '@playwright/test';
import {
  mockUsers,
  mockNewUser,
  mockDisabledUser,
  mockEnabledUser,
  updatedUser,
} from '../test/mocks/mockUsers';
import mockTheme from '../test/mocks/mockTheme';
import { apiPaths } from '../src/lib/widget/api/apiPaths';
import mockRoles from '../test/mocks/mockRoles';
import rootMock from '../test/mocks/rootMock';
import createUserModalMock from '../test/mocks/createUserModalMock';
import deleteUserModalMock from '../test/mocks/deleteUserModalMock';
import enableUserModalMock from '../test/mocks/enableUserModalMock';
import disableUserModalMock from '../test/mocks/disableUserModalMock';
import removePasskeyModalMock from '../test/mocks/removePasskeyModalMock';
import resetPasswordModalMock from '../test/mocks/resetPasswordModalMock';
import generatedPasswordModalMock from '../test/mocks/generatedPasswordModalMock';
import editUserModalMock from '../test/mocks/editUserModalMock';
import mockCustomAttributes from '../test/mocks/mockCustomAttributes';

const configContent = {
  flows: {
    flow1: { version: 1 },
  },
  componentsVersion: '1.2.3',
};

const apiPath = (prop: 'user' | 'tenant', path: string) =>
  `**/*${apiPaths[prop][path]}?tenant=*`;

const MODAL_TIMEOUT = 500;
const STATE_TIMEOUT = 2000;

const getTableBodyCellContentLocatorByIndex = async (
  page: Page,
  rowIdx: number,
  columnIdx: number,
) => {
  const slotName = await page
    .locator('tbody')
    .locator('tr')
    .nth(rowIdx)
    .locator('td')
    .nth(columnIdx)
    .locator('slot')
    .evaluate((e: HTMLSlotElement) => e.name);

  return page.locator(`vaadin-grid-cell-content[slot="${slotName}"]`);
};

const getTableHeadCellContentLocatorByIndex = async (
  page: Page,
  columnIdx: number,
) => {
  const tableCellId = await page
    .locator('thead')
    .locator('tr')
    .locator('th')
    .nth(columnIdx)
    .evaluate((e) => e.id);
  const slotName = tableCellId.replace(
    'vaadin-grid-cell',
    'vaadin-grid-cell-content',
  );

  return page.locator(`vaadin-grid-cell-content[slot="${slotName}"]`);
};

test.describe('widget', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() =>
      window.localStorage.setItem(
        'base.ui.components.url',
        'http://localhost:8765/umd/index.js',
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

    await page.route('*/**/create-user-modal.html', async (route) =>
      route.fulfill({ body: createUserModalMock }),
    );

    await page.route('*/**/edit-user-modal.html', async (route) =>
      route.fulfill({ body: editUserModalMock }),
    );

    await page.route('*/**/delete-users-modal.html', async (route) =>
      route.fulfill({ body: deleteUserModalMock }),
    );

    await page.route('*/**/enable-user-modal.html', async (route) =>
      route.fulfill({ body: enableUserModalMock }),
    );

    await page.route('*/**/disable-user-modal.html', async (route) =>
      route.fulfill({ body: disableUserModalMock }),
    );

    await page.route('*/**/remove-passkey-modal.html', async (route) =>
      route.fulfill({ body: removePasskeyModalMock }),
    );

    await page.route('*/**/reset-password-modal.html', async (route) =>
      route.fulfill({ body: resetPasswordModalMock }),
    );

    await page.route('*/**/generated-password-modal.html', async (route) =>
      route.fulfill({ body: generatedPasswordModalMock }),
    );

    await page.route(apiPath('user', 'create'), async (route) =>
      route.fulfill({ json: { user: mockNewUser } }),
    );

    await page.route(apiPath('user', 'update'), async (route) =>
      route.fulfill({ json: { user: updatedUser } }),
    );

    await page.route(apiPath('tenant', 'roles'), async (route) =>
      route.fulfill({ json: mockRoles }),
    );

    await page.route(apiPath('user', 'customattributes'), async (route) =>
      route.fulfill({ json: mockCustomAttributes }),
    );

    await page.route(apiPath('user', 'search'), async (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ users: mockUsers }),
      }),
    );

    await page.route(apiPath('user', 'deleteBatch'), async (route) =>
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

    await page.goto('http://localhost:5555');
    await page.waitForTimeout(STATE_TIMEOUT);
  });

  test('users table', async ({ page }) => {
    // user with multiple loginIds
    await expect(
      page.locator(`text=${mockUsers[0]['loginIds'][0]}`).first(),
    ).toBeVisible();

    await expect(
      page.locator(`text=${mockUsers[0]['loginIds'][1]}`).first(),
    ).toBeVisible();

    // user with single loginId
    await expect(
      page.locator(`text=${mockUsers[1]['loginIds'][0]}`).first(),
    ).toBeVisible();
  });

  test('editable user', async ({ page }) => {
    await page.route(apiPath('user', 'status'), async (route) =>
      route.fulfill({ json: { user: mockDisabledUser } }),
    );

    await page.waitForTimeout(STATE_TIMEOUT);

    const createUserTrigger = page
      .locator('descope-button')
      .getByTestId('create-user-trigger')
      .first();

    const editUserTrigger = page
      .locator('descope-button')
      .getByTestId('edit-user-trigger')
      .first();

    const enableUserTrigger = page
      .locator('descope-button')
      .getByTestId('enable-user-trigger')
      .first();

    const disableUserTrigger = page
      .locator('descope-button')
      .getByTestId('disable-user-trigger')
      .first();

    const removePasskeyTrigger = page
      .locator('descope-button')
      .getByTestId('remove-passkey-trigger')
      .first();

    // initial buttons state
    expect(createUserTrigger).toBeEnabled();
    expect(editUserTrigger).toBeDisabled();
    expect(enableUserTrigger).toBeDisabled();
    expect(disableUserTrigger).toBeDisabled();
    expect(removePasskeyTrigger).toBeDisabled();

    // select non-editable user (editable: false)
    const NonEditableUserCheckbox = await getTableBodyCellContentLocatorByIndex(
      page,
      3,
      0,
    );
    await NonEditableUserCheckbox.click();

    // wait for widget state
    await page.waitForTimeout(MODAL_TIMEOUT);

    expect(createUserTrigger).toBeEnabled();
    expect(editUserTrigger).toBeDisabled();
    expect(enableUserTrigger).toBeDisabled();
    expect(disableUserTrigger).toBeDisabled();
    expect(removePasskeyTrigger).toBeDisabled();

    // de-select non-editable user
    await NonEditableUserCheckbox.click();

    // select enabled and editable user
    const editableUserCheckbox = await getTableBodyCellContentLocatorByIndex(
      page,
      0,
      0,
    );
    await editableUserCheckbox.click();

    await page.waitForTimeout(STATE_TIMEOUT);

    expect(createUserTrigger).toBeEnabled();
    expect(editUserTrigger).toBeEnabled();
    expect(enableUserTrigger).toBeDisabled();
    expect(disableUserTrigger).toBeEnabled();
    expect(removePasskeyTrigger).toBeEnabled();

    await page.waitForTimeout(STATE_TIMEOUT);

    // de-select enabled and editable user
    await editableUserCheckbox.click();

    // select disabled and editable user
    const disabledUserCheckbox = await getTableBodyCellContentLocatorByIndex(
      page,
      1,
      0,
    );
    await disabledUserCheckbox.click();

    expect(createUserTrigger).toBeEnabled();
    expect(editUserTrigger).toBeEnabled();
    expect(enableUserTrigger).toBeEnabled();
    expect(disableUserTrigger).toBeDisabled();
    expect(removePasskeyTrigger).toBeEnabled();
  });

  test('create user', async ({ page }) => {
    const openAddUserModalButton = page
      .getByTestId('create-user-trigger')
      .first();

    // open add user modal
    await openAddUserModalButton.click();

    await page.waitForTimeout(MODAL_TIMEOUT);

    const createUserLoginIdInput = page.getByLabel('Login Id').first();
    const createUserEmailInput = page.getByLabel('Email').first();

    // submit login id
    await createUserLoginIdInput.fill('someLoginId@test.com');

    // submit email
    await createUserEmailInput.fill('someEmail@test.com');

    // click modal create button
    const createUserButton = page
      .locator('descope-button')
      .filter({ hasText: 'Create' })
      .getByTestId('create-user-modal-submit')
      .first();
    await createUserButton.click();

    // update grid items
    await expect(
      page.locator(`text=${mockNewUser['loginIds'][0]}`).first(),
    ).toBeVisible();

    // show notification
    await expect(page.locator('text=User created successfully')).toBeVisible();
  });

  test('edit user', async ({ page }) => {
    const openEditUserModalButton = page
      .getByTestId('edit-user-trigger')
      .first();

    await page.waitForTimeout(STATE_TIMEOUT);

    // select user
    const cellContentLocator = await getTableBodyCellContentLocatorByIndex(
      page,
      0,
      0,
    );
    await cellContentLocator.click();

    // open add user modal
    await openEditUserModalButton.click();

    await page.waitForTimeout(MODAL_TIMEOUT);

    const editUserEmailInput = page.getByLabel('Email').last();
    const editUserNameInput = page.getByLabel('Name').last();
    const editUserPhoneInput = page.getByLabel('Phone').last();
    const editUserRolesInput = page.getByLabel('Roles').last();

    // clear previous email
    await editUserEmailInput.evaluate((e: HTMLInputElement) => (e.value = ''));
    // edit email
    await editUserEmailInput.fill(updatedUser.email);

    // edit name
    await editUserNameInput.fill(updatedUser.name);

    await editUserPhoneInput.focus();
    await page.keyboard.type('5554444');

    await editUserRolesInput.focus();
    await page.keyboard.press('Backspace');

    // click modal button
    const editUserButton = page
      .locator('descope-button')
      .filter({ hasText: 'Edit' })
      .getByTestId('edit-user-modal-submit')
      .first();

    await editUserButton.click();

    // update grid items
    await expect(
      page.locator(`text=${updatedUser.name}`).first(),
    ).toBeVisible();
    await expect(
      page.locator(`text=${updatedUser.email}`).first(),
    ).toBeVisible();
    await expect(
      page.locator(`text=${updatedUser.phone}`).first(),
    ).toBeVisible();

    // show notification
    await expect(page.locator('text=User updated successfully')).toBeVisible();
  });

  test('delete users', async ({ page }) => {
    const deleteUserTrigger = page.getByTestId('delete-users-trigger').first();
    const deleteUserModalButton = page
      .getByTestId('delete-users-modal-submit')
      .first();

    // delete button initial state is disabled
    expect(deleteUserTrigger).toBeDisabled();

    // select all items
    const selectAll = await getTableHeadCellContentLocatorByIndex(page, 0);
    await selectAll.click();

    // delete button is enabled on selection (even for non editable user)
    expect(deleteUserTrigger).toBeEnabled();

    const cellContentLocator = await getTableBodyCellContentLocatorByIndex(
      page,
      3,
      0,
    );
    await cellContentLocator.click();

    // delete button is enabled on selection
    expect(deleteUserTrigger).toBeEnabled();

    // delete users
    await deleteUserTrigger.click();

    // show delete users modal
    const deleteUserModal = page.locator('text=Delete Users');
    expect(deleteUserModal).toBeVisible();

    // click modal delete button
    await deleteUserModalButton.click();

    // wait for modal to close
    await page.waitForTimeout(MODAL_TIMEOUT);

    // delete modal closed
    await expect(page.locator('Delete Users')).toBeHidden();

    // show notification
    await expect(
      page.locator(`text=${mockUsers.length - 1} users deleted successfully`),
    ).toBeVisible();

    // update grid items
    await expect(page.locator('descope-grid').locator('#items')).toBeEmpty();
  });

  test('disable user', async ({ page }) => {
    await page.route(apiPath('user', 'status'), async (route) =>
      route.fulfill({ json: { user: mockDisabledUser } }),
    );

    const disableUserTrigger = page
      .locator('descope-button')
      .getByTestId('disable-user-trigger')
      .first();
    const disableUserModalButton = page
      .getByTestId('disable-user-modal-submit')
      .first();

    // disable user button initial state is disabled
    expect(disableUserTrigger).toBeDisabled();

    // wait for widget state
    await page.waitForTimeout(STATE_TIMEOUT);

    // select first user (status: active)
    const cellContentLocator = await getTableBodyCellContentLocatorByIndex(
      page,
      0,
      0,
    );
    await cellContentLocator.click();

    // disable user button is enabled on selection
    expect(disableUserTrigger).toBeEnabled();

    // disable user
    await disableUserTrigger.click();

    // show disable user modal
    const disableUserModal = page.locator('text=Disable User');
    expect(disableUserModal).toBeVisible();

    // click modal activate button
    await disableUserModalButton.click();

    // wait for modal to close
    await page.waitForTimeout(MODAL_TIMEOUT);

    // disable modal closed
    await expect(page.locator('Disable')).toBeHidden();

    // show notification
    await expect(page.locator(`text=User disabled successfully`)).toBeVisible();
  });

  test('enable user', async ({ page }) => {
    await page.route(apiPath('user', 'status'), async (route) =>
      route.fulfill({ json: { user: mockEnabledUser } }),
    );

    const enableUserTrigger = page
      .locator('descope-button')
      .getByTestId('enable-user-trigger')
      .first();
    const enableUserModalButton = page
      .getByTestId('enable-user-modal-submit')
      .first();

    // enable user button initial state is disabled
    expect(enableUserTrigger).toBeDisabled();

    // wait for widget state
    await page.waitForTimeout(STATE_TIMEOUT);

    // select second user (status: disabled)
    const cellContentLocator = await getTableBodyCellContentLocatorByIndex(
      page,
      1,
      0,
    );
    await cellContentLocator.click();

    // enable user button is enabled on selection
    expect(enableUserTrigger).toBeEnabled();

    // enable user
    await enableUserTrigger.click();

    // show enable user modal
    const enableUserModal = page.locator('text=Activate User');
    expect(enableUserModal).toBeVisible();

    // click modal activate button
    await enableUserModalButton.click();

    // wait for modal to close
    await page.waitForTimeout(MODAL_TIMEOUT);

    // enable modal closed
    await expect(page.locator('Activate')).toBeHidden();

    // show notification
    await expect(page.locator(`text=User enabled successfully`)).toBeVisible();
  });

  test('remove passkey', async ({ page }) => {
    await page.route(apiPath('user', 'removePasskey'), async (route) =>
      route.fulfill({ json: {} }),
    );

    const removePasskeyTrigger = page
      .locator('descope-button')
      .getByTestId('remove-passkey-trigger')
      .first();
    const removePasskeyModalButton = page
      .getByTestId('remove-passkey-modal-submit')
      .first();

    // enable user button initial state is disabled
    expect(removePasskeyTrigger).toBeDisabled();

    // wait for widget state
    await page.waitForTimeout(STATE_TIMEOUT);

    // select second user
    const cellContentLocator = await getTableBodyCellContentLocatorByIndex(
      page,
      1,
      0,
    );
    await cellContentLocator.click();

    await page.waitForTimeout(STATE_TIMEOUT);

    // enable user button is enabled on selection
    expect(removePasskeyTrigger).toBeEnabled();

    // enable user
    await removePasskeyTrigger.click();

    // show enable user modal
    const removePasskeyModal = page.locator('text=Remove passkey for');
    expect(removePasskeyModal).toBeVisible();

    // click modal activate button
    await removePasskeyModalButton.click();

    // wait for modal to close
    await page.waitForTimeout(MODAL_TIMEOUT);

    // enable modal closed
    await expect(page.locator('Remove passkey for')).toBeHidden();

    // show notification
    await expect(
      page.locator(`text=Successfully removed user's passkey`),
    ).toBeVisible();
  });

  test('reset password', async ({ page, browserName }) => {
    const cleartext = 'aaaaaaaa';
    await page.route(apiPath('user', 'setTempPassword'), async (route) =>
      route.fulfill({ json: { cleartext } }),
    );

    const resetPasswordTrigger = page
      .locator('descope-button')
      .getByTestId('reset-password-trigger')
      .first();
    const resetPasswordModalButton = page
      .getByTestId('reset-password-modal-submit')
      .first();

    // enable user button initial state is disabled
    expect(resetPasswordTrigger).toBeDisabled();

    // wait for widget state
    await page.waitForTimeout(STATE_TIMEOUT);

    // select second user (status: active)
    const cellContentLocator = await getTableBodyCellContentLocatorByIndex(
      page,
      1,
      0,
    );
    await cellContentLocator.click();

    // enable user button is enabled on selection
    expect(resetPasswordTrigger).toBeEnabled();

    // enable user
    await resetPasswordTrigger.click();

    // show enable user modal
    const resetPasswordModal = page.locator('text=Reset User Password');
    expect(resetPasswordModal).toBeVisible();

    const resetPasswordModalMessage = page.locator(
      `text=This will generate a new temporary password for ${mockUsers[1].email}`,
    );
    expect(resetPasswordModalMessage).toBeVisible();

    // click modal button
    await resetPasswordModalButton.click();

    // wait for modal to close
    await page.waitForTimeout(MODAL_TIMEOUT);

    // enable modal closed
    await expect(page.locator('Reset User Password')).toBeHidden();

    // show notification
    await expect(
      page.locator(`text=Successfully reset user password`),
    ).toBeVisible();

    const generatedPasswordInput = page
      .getByPlaceholder('Generated password')
      .last();
    expect(await generatedPasswordInput.inputValue()).toEqual(cleartext);

    // click modal button
    const closeGeneratedPasswordButton = page
      .locator('descope-button')
      .filter({ hasText: 'Copy to clipboard & close' })
      .getByTestId('generated-password-modal-close')
      .first();
    await closeGeneratedPasswordButton.click();

    if (browserName === 'chromium') {
      const clipboardContent = await page.evaluate(
        'navigator.clipboard.readText()',
      );
      expect(clipboardContent).toEqual(cleartext);
    }
  });

  test('search users', async ({ page }) => {
    test.setTimeout(60_000);
    await page.waitForLoadState('networkidle');

    await page.route(apiPath('user', 'search'), async (route) => {
      const { text } = route.request().postDataJSON();
      expect(text).toEqual('mockSearchString');
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ users: [mockUsers[1]] }),
      });
    });

    await page.waitForTimeout(STATE_TIMEOUT);

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
      page.locator(`text=${mockUsers[0]['loginIds'][0]}`).first(),
    ).toBeHidden({ timeout: 20000 });
  });

  test('close notification', async ({ page }) => {
    const deleteUserTrigger = page.getByTestId('delete-users-trigger').first();
    const deleteUserModalButton = page
      .getByTestId('delete-users-modal-submit')
      .first();

    // select all items
    const selectAll = await getTableHeadCellContentLocatorByIndex(page, 0);
    await selectAll.click();

    const lastUser = await getTableBodyCellContentLocatorByIndex(page, 3, 0);
    await lastUser.click();

    // delete users
    await deleteUserTrigger.click();

    // show delete users modal
    const deleteUserModal = page.locator('text=Delete Users');
    expect(deleteUserModal).toBeVisible();

    // click modal delete button
    await deleteUserModalButton.click();

    // wait for modal to close
    await page.waitForTimeout(MODAL_TIMEOUT);

    // show notification
    await expect(
      page.locator(`text=${mockUsers.length - 1} users deleted successfully`),
    ).toBeVisible();

    // click close button
    await page.getByRole('img').nth(1).click();

    // notification closed
    await expect(
      page.locator(`text=${mockUsers.length} users deleted successfully`),
    ).toBeHidden();
  });
});
