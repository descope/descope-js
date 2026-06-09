import { test, expect } from '@playwright/test';
import { componentsPort, widgetPort } from '../playwright.config';
import mockTheme from '../test/mocks/mockTheme';
import { apiPaths } from '../src/lib/widget/api/apiPaths';
import {
  mockRoles,
  mockNewRole,
  mockRolesPermissions,
} from '../test/mocks/mockRoles';
import rootMock from '../test/mocks/rootMock';
import createRoleModalMock from '../test/mocks/createRoleModalMock';
import editRoleModalMock from '../test/mocks/editRoleModalMock';
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

    await page.route('*/**/create-role-modal.html', async (route) =>
      route.fulfill({ body: createRoleModalMock }),
    );

    await page.route('*/**/edit-role-modal.html', async (route) =>
      route.fulfill({ body: editRoleModalMock }),
    );

    await page.route('*/**/delete-roles-modal.html', async (route) =>
      route.fulfill({ body: deleteRoleModalMock }),
    );

    await page.route(apiPath('role', 'create'), async (route) =>
      route.fulfill({ json: mockNewRole }),
    );

    await page.route(apiPath('role', 'update'), async (route) =>
      route.fulfill({ json: mockNewRole }),
    );

    await page.route(apiPath('tenant', 'permissions'), async (route) =>
      route.fulfill({ json: mockRolesPermissions }),
    );

    await page.route(apiPath('role', 'search'), async (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ roles: mockRoles.roles }),
      }),
    );

    await page.route(apiPath('role', 'deleteBatch'), async (route) =>
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

    await page.goto(`http://localhost:${widgetPort}`, {
      waitUntil: 'networkidle',
    });
  });

  test('roles table', async ({ page }) => {
    await expect(
      page.locator(`text=${mockRoles.roles[0]['name']}`).first(),
    ).toBeVisible();

    await expect(
      page.locator(`text=${mockRoles.roles[1]['name']}`).first(),
    ).toBeVisible();

    await expect(
      page.locator(`text=${mockRoles.roles[2]['name']}`).first(),
    ).toBeVisible();
  });

  test('create role', async ({ page }) => {
    const openAddRoleModalButton = page
      .getByTestId('create-role-trigger')
      .first();

    // open add role modal
    await openAddRoleModalButton.click();

    const createRoleNameInput = page.getByText('Name');
    const createRoleDescriptionInput = page.getByText('Description');

    // submit name
    await (await createRoleNameInput.all()).at(1).fill('some role name');

    // submit description
    await (await createRoleDescriptionInput.all()).at(1).fill('some role desc');

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

  test('edit role', async ({ page }) => {
    await page.getByTestId('edit-role-trigger').first().isDisabled();
    await page.locator('descope-checkbox').last().click();
    await page.getByTestId('edit-role-trigger').first().isEnabled();

    // open edit role modal
    const openEditRoleModalButton = page
      .getByTestId('edit-role-trigger')
      .first();
    await openEditRoleModalButton.click();

    const editRoleNameInput = page.getByLabel('Name');
    const editRoleDescriptionInput = page.getByLabel('Description');

    await expect(
      page.locator(`text=${mockRoles.roles[2].name}`).first(),
    ).toBeVisible();

    await expect(
      page.locator(`text=${mockRoles.roles[2].description}`).first(),
    ).toBeVisible();

    await page.locator(`id=toggleButton`).last().click();
    await expect(
      page.locator(`text=${mockRolesPermissions.permissions[0].name}`).last(),
    ).toBeVisible();
    await expect(
      page.locator(`text=${mockRolesPermissions.permissions[1].name}`).last(),
    ).toBeVisible();
    await expect(
      page.locator(`text=${mockRolesPermissions.permissions[2].name}`).last(),
    ).toBeVisible();

    await page.locator(`id=toggleButton`).last().click();

    // submit name
    await editRoleNameInput.last().fill('some role name');

    // submit description
    await editRoleDescriptionInput.last().fill('some role desc');

    // click modal edit button
    const editRoleButton = page
      .locator('descope-button')
      .filter({ hasText: 'Edit' })
      .getByTestId('edit-role-modal-submit')
      .first();
    await editRoleButton.click();

    // update grid items
    await expect(
      page.locator(`text=${mockNewRole['name']}`).first(),
    ).toBeVisible();

    // show notification
    await expect(page.locator('text=Role updated successfully')).toBeVisible();
  });

  test('delete roles', async ({ page }) => {
    const deleteRoleTrigger = await page
      .getByTestId('delete-roles-trigger')
      .first();
    const deleteRoleModalButton = await page
      .getByTestId('delete-roles-modal-submit')
      .first();

    await page.waitForTimeout(MODAL_TIMEOUT);

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

    // Handle all search requests (initial empty-text mount call AND the user-typed
    // call). Branch on `text` to filter — asserting inside the handler would race
    // with the initial mount call where text is "".
    await page.route(apiPath('role', 'search'), async (route) => {
      const { text } = route.request().postDataJSON();
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          roles:
            text === 'mockSearchString'
              ? [mockRoles.roles[1]]
              : mockRoles.roles,
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
      if (!req.url().includes('/role/search')) return false;
      try {
        return req.postDataJSON()?.text === 'mockSearchString';
      } catch {
        return false;
      }
    });

    // only search results shown in grid
    await expect(
      page.locator(`text=${mockRoles.roles[0]['name']}`).first(),
    ).toBeHidden();
  });

  test('duplicate role button is enabled only when exactly one role is selected', async ({
    page,
  }) => {
    const duplicateTrigger = page.getByTestId('duplicate-role-trigger').first();

    await page.waitForTimeout(MODAL_TIMEOUT);

    // initially disabled
    await expect(duplicateTrigger).toBeDisabled();

    // select one row → enabled
    await page.locator('descope-checkbox').last().click();
    await expect(duplicateTrigger).toBeEnabled();

    // select a second row → disabled
    await page.locator('descope-checkbox').nth(2).click();
    await expect(duplicateTrigger).toBeDisabled();

    // unselect the second → back to one selected → enabled
    await page.locator('descope-checkbox').nth(2).click();
    await expect(duplicateTrigger).toBeEnabled();
  });

  test('duplicate role', async ({ page }) => {
    // select the last role row (Role 2)
    await page.locator('descope-checkbox').last().click();

    // Override the create-role route to capture the submitted body — verifying
    // the prefill end-to-end. Reading the wrapper's value via the DOM is
    // unreliable on Vaadin web-components (the value lives on the inner input
    // but doesn't surface on the wrapper's .value JS property at assert time).
    let capturedCreatePayload: any;
    await page.route(apiPath('role', 'create'), async (route) => {
      capturedCreatePayload = route.request().postDataJSON();
      return route.fulfill({ json: mockNewRole });
    });

    // open duplicate modal
    await page.getByTestId('duplicate-role-trigger').first().click();

    // submit (button label is "Create" since the create modal is reused)
    await page.getByTestId('create-role-modal-submit').first().click();

    // toast text comes from the duplicateRole thunk (not createRole).
    // Toast only appears after the create call completes, so this implicitly
    // waits for the route handler above to capture the request body.
    await expect(
      page.locator('text=Role duplicated successfully'),
    ).toBeVisible();

    // assert the prefill values made it into the submitted body
    expect(capturedCreatePayload?.name).toBe(`${mockRoles.roles[2].name} Copy`);
    expect(capturedCreatePayload?.description).toBe(
      mockRoles.roles[2].description,
    );
    expect(capturedCreatePayload?.permissionNames).toEqual(
      mockRoles.roles[2].permissionNames,
    );

    // new role appears in the grid
    await expect(
      page.locator(`text=${mockNewRole['name']}`).first(),
    ).toBeVisible();
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
