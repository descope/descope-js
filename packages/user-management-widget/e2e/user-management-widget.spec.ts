import { test, expect } from '@playwright/test';
import { mockUsers, mockNewUser } from '../test/mocks/mockUsers';
import mockTheme from '../test/mocks/mockTheme';
import { apiPaths } from '../src/lib/widget/api/apiPaths';
import mockRoles from '../test/mocks/mockRoles';

const configContent = {
  flows: {
    flow1: { version: 1 },
  },
  componentsVersion: '1.2.3',
};

const apiPath = (prop: 'user' | 'tenant', path: string) =>
  `**/*${apiPaths[prop][path]}?tenant=*`;

const MODAL_TIMEOUT = 500;

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

    await page.route(apiPath('user', 'create'), async (route) =>
      route.fulfill({ json: { user: mockNewUser } }),
    );

    await page.route(apiPath('tenant', 'roles'), async (route) =>
      route.fulfill({ json: mockRoles }),
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

    await page.goto('http://localhost:5555');
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

  test('create user', async ({ page }) => {
    const openAddUserModalButton = page
      .getByTestId('create-user-trigger')
      .first();

    // open add user modal
    await openAddUserModalButton.click();

    const createUserLoginIdInput = page.getByLabel('Login Id');
    const createUserEmailInput = page.getByLabel('Email');

    // submit login id
    await createUserLoginIdInput.fill('someLoginId@test.com');

    // submit email
    await createUserEmailInput.fill('someEmail@test.com');

    await page.pause();
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

  test('delete users', async ({ page }) => {
    const deleteUserTrigger = page.getByTestId('delete-users-trigger').first();
    const deleteUserModalButton = page
      .getByTestId('delete-users-modal-submit')
      .first();

    // delete button initial state is disabled
    expect(deleteUserTrigger).toBeDisabled();

    // select all items
    await page.locator('descope-checkbox').first().click();

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
      page.locator(`text=${mockUsers.length} users deleted successfully`),
    ).toBeVisible();

    // update grid items
    await expect(page.locator('descope-grid').locator('#items')).toBeEmpty();
  });

  test('search users', async ({ page }) => {
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

    const searchInput = page
      .getByTestId('search-input')
      .locator('input')
      .first();

    // focus search input
    await searchInput.focus();

    // enter search string
    await searchInput.fill('mockSearchString');

    // wait for results to filter
    // await page.waitForTimeout(5000);

    // only search results shown in grid
    await expect(
      page.locator(`text=${mockUsers[0]['loginIds'][0]}`).first(),
    ).toBeHidden();
  });

  test('close notification', async ({ page }) => {
    const deleteUserTrigger = page.getByTestId('delete-users-trigger').first();
    const deleteUserModalButton = page
      .getByTestId('delete-users-modal-submit')
      .first();

    // select all items
    await page.locator('descope-checkbox').first().click();

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
      page.locator(`text=${mockUsers.length} users deleted successfully`),
    ).toBeVisible();

    // click close button
    await page.getByRole('img').nth(1).click();

    // notification closed
    await expect(
      page.locator(`text=${mockUsers.length} users deleted successfully`),
    ).toBeHidden();
  });
});
