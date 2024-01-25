import { test, expect } from '@playwright/test';
import { mockUsers, mockNewUser } from '../test/mocks/mockUsers';
import mockTheme from '../test/mocks/mockTheme';

const configContent = {
  flows: {
    flow1: { version: 1 },
  },
  componentsVersion: '1.2.3',
};

test.describe('widget', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'base.ui.components.url',
        'http://localhost:8765/umd/index.js',
      );
    });

    await page.route('*/**/config.json', async (route) => {
      const json = configContent;
      await route.fulfill({ json });
    });

    await page.route('*/**/theme.json', async (route) => {
      const json = mockTheme;
      await route.fulfill({ json });
    });

    await page.route('**/*v1/mgmt/user/search?tenant=*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ users: mockUsers }),
      });
    });

    await page.route('**/*v1/mgmt/user/create?tenant=*', async (route) => {
      const json = { user: mockNewUser };
      await route.fulfill({ json });
    });

    await page.route(
      '**/*/v1/mgmt/user/delete/batch?tenant=*',
      async (route) => {
        const json = { tenant: 'mockTenant' };
        await route.fulfill({ json });
      },
    );

    await page.goto('http://localhost:5555');
  });

  test('users table', async ({ page }) => {
    await expect(
      page.locator(`text=${mockUsers[0]['loginIds'][0]}`).first(),
    ).toBeVisible();
    await expect(
      page.locator(`text=${mockUsers[1]['loginIds'][0]}`).first(),
    ).toBeVisible();
  });

  test('add user', async ({ page }) => {
    const openAddUserModalButton = page.locator('text=+ User');
    const createUserLoginIdInput = page.getByLabel('Login Id');
    const createUserEmailInput = page.getByLabel('Email');
    const createUserButton = page.locator('text=Create');

    // open add user modal
    await openAddUserModalButton.click();

    // submit login id
    await createUserLoginIdInput.fill('someLoginId@test.com');

    // submit email
    await createUserEmailInput.fill('someEmail@test.com');

    // click modal create button
    await createUserButton.click();

    // update grid items
    await expect(
      page.locator(`text=${mockNewUser['loginIds'][0]}`).first(),
    ).toBeVisible();

    // show notification
    await expect(page.locator('text=User created successfully')).toBeVisible();
  });

  test('delete users', async ({ page }) => {
    const deleteUserTrigger = page
      .locator('#content-root descope-button')
      .filter({ hasText: 'Delete' })
      .getByRole('button');

    const deleteUserModalButton = page
      .locator('descope-container')
      .filter({ hasText: 'Delete 2 users?' })
      .locator('vaadin-button')
      .nth(1);

    // delete button initial state is disabled
    expect(deleteUserTrigger).toBeDisabled();

    // select all items
    await page.locator('vaadin-grid-cell-content').first().click();

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
    await page.waitForTimeout(500);

    // delete modal closed
    await expect(page.locator('Delete Users')).toBeHidden();

    // show notification
    await expect(
      page.locator(`text=${mockUsers.length} users deleted successfully`),
    ).toBeVisible();

    // update grid items
    await expect(page.locator('#items')).toBeEmpty();
  });

  test('search users', async ({ page }) => {
    const searchInput = page
      .locator('#content-root descope-text-field')
      .locator('input');

    // focus search input
    await searchInput.focus();

    // enter search string
    await searchInput.fill('user2');

    // wait for results to filter
    await page.waitForTimeout(500);

    // only search results shown in grid
    await expect(page.locator('text=user1@user1.com').nth(0)).toBeHidden();
    await expect(page.locator('text=user1@user1.com').nth(1)).toBeHidden();
  });

  test('close notification', async ({ page }) => {
    const deleteUserTrigger = page
      .locator('#content-root descope-button')
      .filter({ hasText: 'Delete' })
      .getByRole('button');

    const deleteUserModalButton = page
      .locator('descope-container')
      .filter({ hasText: 'Delete 2 users?' })
      .locator('vaadin-button')
      .nth(1);

    // select all items
    await page.locator('vaadin-grid-cell-content').first().click();

    // delete users
    await deleteUserTrigger.click();

    // show delete users modal
    const deleteUserModal = page.locator('text=Delete Users');
    expect(deleteUserModal).toBeVisible();

    // click modal delete button
    await deleteUserModalButton.click();

    // wait for modal to close
    await page.waitForTimeout(500);

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
