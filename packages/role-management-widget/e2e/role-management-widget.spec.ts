import { test, expect } from '@playwright/test';
import mockTheme from '../test/mocks/mockTheme';
import { apiPaths } from '../src/lib/widget/api/apiPaths';
import {
  mockRoles,
  mockNewRole,
  mockRolesPermissions,
} from '../test/mocks/mockRoles';
import rootMock from '../test/mocks/rootMock';
import createRoleModalMock from '../test/mocks/createRoleModalMock';
import deleteRoleModalMock from '../test/mocks/deleteRoleModalMock';

const configContent = {
  flows: {
    flow1: { version: 1 },
  },
  componentsVersion: '1.2.3',
};

const apiPath = (prop: 'role' | 'tenant', path: string) =>
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

    await page.route('*/**/root.html', async (route) =>
      route.fulfill({ body: rootMock }),
    );

    await page.route('*/**/create-role-modal.html', async (route) =>
      route.fulfill({ body: createRoleModalMock }),
    );

    await page.route('*/**/delete-roles-modal.html', async (route) =>
      route.fulfill({ body: deleteRoleModalMock }),
    );

    await page.route(apiPath('role', 'create'), async (route) =>
      route.fulfill({ json: { mockNewRole } }),
    );

    await page.route(apiPath('tenant', 'permissions'), async (route) =>
      route.fulfill({ json: mockRolesPermissions }),
    );

    await page.route(apiPath('role', 'search'), async (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ roles: mockRoles }),
      }),
    );

    await page.route(apiPath('role', 'deleteBatch'), async (route) =>
      route.fulfill({ json: { tenant: 'mockTenant' } }),
    );

    await page.goto('http://localhost:5555');
  });

  test('roles table', async ({ page }) => {
    await expect(
      page.locator(`text=${mockRoles[0]['name']}`).first(),
    ).toBeVisible();
  });

  test('create role', async ({ page }) => {
    const openAddRoleModalButton = page
      .getByTestId('create-role-trigger')
      .first();

    // open add role modal
    await openAddRoleModalButton.click();

    const createRoleNameInput = page.getByLabel('Name');
    const createRoleDescriptionInput = page.getByLabel('Description');

    // submit name
    await createRoleNameInput.fill('some role name');

    // submit description
    await createRoleDescriptionInput.fill('some role desc');

    await page.pause();
    // click modal create button
    const createRoleButton = page
      .locator('descope-button')
      .filter({ hasText: 'Create' })
      .getByTestId('create-role-modal-submit')
      .first();
    await createRoleButton.click();

    // update grid items
    await expect(
      page.locator(`text=${mockNewRole['name']}`).first(),
    ).toBeVisible();

    // show notification
    await expect(page.locator('text=Role created successfully')).toBeVisible();
  });

  test('delete roles', async ({ page }) => {
    const deleteRoleTrigger = page.getByTestId('delete-roles-trigger').first();
    const deleteRoleModalButton = page
      .getByTestId('delete-roles-modal-submit')
      .first();

    // delete button initial state is disabled
    expect(deleteRoleTrigger).toBeDisabled();

    // select all items
    await page.locator('descope-checkbox').first().click();

    // delete button is enabled on selection
    expect(deleteRoleTrigger).toBeEnabled();

    // delete roles
    await deleteRoleTrigger.click();

    // show delete roles modal
    const deleteRoleModal = page.locator('text=Delete Roles');
    expect(deleteRoleModal).toBeVisible();

    // click modal delete button
    await deleteRoleModalButton.click();

    // wait for modal to close
    await page.waitForTimeout(MODAL_TIMEOUT);

    // delete modal closed
    await expect(page.locator('Delete Roles')).toBeHidden();

    // show notification
    await expect(
      page.locator(`text=${mockRoles.roles.length} roles deleted successfully`),
    ).toBeVisible();

    // update grid items
    await expect(page.locator('descope-grid').locator('#items')).toBeEmpty();
  });

  test('search roles', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    await page.route(apiPath('role', 'search'), async (route) => {
      const { text } = route.request().postDataJSON();
      expect(text).toEqual('mockSearchString');
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ roles: [mockRoles[1]] }),
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
      page.locator(`text=${mockRoles[0]['name']}`).first(),
    ).toBeHidden();
  });

  test('close notification', async ({ page }) => {
    const deleteRoleTrigger = page.getByTestId('delete-roles-trigger').first();
    const deleteRoleModalButton = page
      .getByTestId('delete-roles-modal-submit')
      .first();

    // select all items
    await page.locator('descope-checkbox').first().click();

    // delete roles
    await deleteRoleTrigger.click();

    // show delete roles modal
    const deleteRoleModal = page.locator('text=Delete Roles');
    expect(deleteRoleModal).toBeVisible();

    // click modal delete button
    await deleteRoleModalButton.click();

    // wait for modal to close
    await page.waitForTimeout(MODAL_TIMEOUT);

    // show notification
    await expect(
      page.locator(`text=${mockRoles.roles.length} roles deleted successfully`),
    ).toBeVisible();

    // click close button
    await page.getByRole('img').nth(1).click();

    // notification closed
    await expect(
      page.locator(`text=${mockRoles.roles.length} roles deleted successfully`),
    ).toBeHidden();
  });
});
