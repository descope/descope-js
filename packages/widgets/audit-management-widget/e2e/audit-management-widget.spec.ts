import { test, expect } from '@playwright/test';
import { componentsPort, widgetPort } from '../playwright.config';
import mockTheme from '../test/mocks/mockTheme';
import { apiPaths } from '../src/lib/widget/api/apiPaths';
import { mockAudit } from '../test/mocks/mockAudit';
import rootMock from '../test/mocks/rootMock';

const configContent = {
  flows: {
    flow1: { version: 1 },
  },
  componentsVersion: '1.2.3',
};

const apiPath = (prop: 'audit' | 'tenant', path: string) =>
  `**/*${apiPaths[prop][path]}?tenant=*`;

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

    await page.route(apiPath('audit', 'search'), async (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ audits: mockAudit.audit }),
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

    await page.goto(`http://localhost:${widgetPort}`);
  });

  test('audit table', async ({ page }) => {
    await expect(
      page.locator(`text=${mockAudit.audit[0]['actorId']}`).first(),
    ).toBeVisible({ timeout: 10000 });

    await expect(
      page.locator(`text=${mockAudit.audit[1]['actorId']}`).first(),
    ).toBeVisible({ timeout: 10000 });

    await expect(
      page.locator(`text=${mockAudit.audit[2]['actorId']}`).first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test('search audit', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.route(apiPath('audit', 'search'), async (route) => {
      const { text, from } = route.request().postDataJSON();
      expect(text).toEqual('');
      const now = new Date();
      const expectedFrom = now.setDate(now.getDate() - 2);
      expect(from).toBeGreaterThan(new Date(expectedFrom).getTime());

      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ audits: mockAudit.audit }),
      });
    });

    await expect(
      page.locator(`text=${mockAudit.audit[0]['actorId']}`).first(),
    ).toBeVisible();

    await expect(
      page.locator(`text=${mockAudit.audit[1]['actorId']}`).first(),
    ).toBeVisible();

    await expect(
      page.locator(`text=${mockAudit.audit[2]['actorId']}`).first(),
    ).toBeVisible();

    await page.waitForLoadState('networkidle');
    await page.route(apiPath('audit', 'search'), async (route) => {
      const { text, from } = route.request().postDataJSON();
      expect(text).toEqual('mockSearchString');
      const now = new Date();
      const expectedFrom = now.setDate(now.getDate() - 2);
      expect(from).toBeGreaterThan(new Date(expectedFrom).getTime());

      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ audits: [mockAudit.audit[1]] }),
      });
    });

    const searchInput = page
      .getByTestId('search-input')
      .locator('input')
      .first();

    await page.waitForTimeout(1000);

    // focus search input
    await searchInput.focus();

    // enter search string
    await searchInput.fill('mockSearchString');
    await page.keyboard.press('Enter');

    await page.waitForTimeout(1000);

    // only search results shown in grid
    await expect(
      page.locator(`text=${mockAudit.audit[0]['actorId']}`).first(),
    ).toBeHidden();

    await expect(
      page.locator(`text=${mockAudit.audit[1]['actorId']}`).first(),
    ).toBeVisible();

    await expect(
      page.locator(`text=${mockAudit.audit[2]['actorId']}`).first(),
    ).toBeHidden();

    await page.waitForLoadState('networkidle');
    await page.route(apiPath('audit', 'search'), async (route) => {
      const { text, from } = route.request().postDataJSON();
      expect(text).toEqual('mockSearchString');
      const now = new Date();
      const expectedFrom = now.setHours(now.getHours() - 2);
      expect(from).toBeGreaterThan(new Date(expectedFrom).getTime());

      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ audits: [mockAudit.audit[2]] }),
      });
    });

    // focus search input
    await searchInput.focus();

    // enter search string
    const rangeInput = page.getByTestId('range-input').locator('input').first();

    // focus search input
    await rangeInput.focus();

    // enter search string
    await rangeInput.fill('Last Hour');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    // only search results shown in grid
    await expect(
      page.locator(`text=${mockAudit.audit[0]['actorId']}`).first(),
    ).toBeHidden();

    await expect(
      page.locator(`text=${mockAudit.audit[1]['actorId']}`).first(),
    ).toBeHidden();

    await expect(
      page.locator(`text=${mockAudit.audit[2]['actorId']}`).first(),
    ).toBeVisible();
  });
});
