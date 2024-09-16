import { test, expect } from '@playwright/test';
import mockTheme from '../test/mocks/mockTheme';
import { apiPaths } from '../src/lib/widget/api/apiPaths';
import rootMock from '../test/mocks/rootMock';
import { mockSsoApps } from '../test/mocks/mockSsoApps';
import { SSOAppType } from '../src/lib/widget/api/types';

const configContent = {
  flows: {
    flow1: { version: 1 },
  },
  componentsVersion: '1.2.3',
};

const apiPath = (prop: 'ssoApps', path: string) =>
  `**/*${apiPaths[prop][path]}`;

const samlApps = mockSsoApps.filter((app) => app.appType === SSOAppType.saml);

test.describe('widget', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() =>
      window.localStorage.setItem(
        'base.ui.components.url',
        'http://localhost:8769/umd/index.js',
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

    await page.route(apiPath('ssoApps', 'load'), async (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ apps: mockSsoApps }),
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

    await page.goto('http://localhost:5560');
  });

  test('saml apps are in the list', async ({ page }) => {
    for (const app of samlApps) {
      await expect(page.locator(`text=${app.name}`).first()).toBeVisible();
    }
  });
  test('click app opens a new tab', async ({ page }) => {
    const newTabPromise = page.waitForEvent('popup');

    const app = page.locator(`text=${samlApps[0].name}`).first();
    await app.click();

    const newTab = await newTabPromise;
    await newTab.waitForLoadState();

    await expect(newTab).toHaveURL(samlApps[0].samlSettings.idpInitiatedUrl);
  });
});
