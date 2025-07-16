import { test, expect } from '@playwright/test';
import mockTheme from '../test/mocks/mockTheme';
import { apiPaths } from '../src/lib/widget/api/apiPaths';
import rootMock from '../test/mocks/rootMock';
import {
  mockConnectedApps,
  mockOutboundApps,
  mockUser,
} from '../test/mocks/mockOutboundApps';

const configContent = {
  flows: {
    flow1: { version: 1 },
  },
  componentsVersion: '1.2.3',
};

const apiPath = (prop: 'outboundApps' | 'user', path: string) =>
  `**/*${apiPaths[prop][path]}`;

test.describe('widget', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() =>
      window.localStorage.setItem(
        'base.ui.components.url',
        'http://localhost:5500/umd/index.js',
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

    await page.route(apiPath('user', 'me'), async (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ apps: mockUser }),
      }),
    );

    await page.route(apiPath('outboundApps', 'load'), async (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ apps: mockOutboundApps }),
      }),
    );

    await page.route(
      apiPath('outboundApps', 'getConnectedOutboundApps'),
      async (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ appsIds: mockConnectedApps }),
        }),
    );

    await page.goto('http://localhost:5560');
  });

  test('outbound apps are in the list', async ({ page }) => {
    for (const app of mockOutboundApps) {
      await expect(page.locator(`text=${app.name}`).first()).toBeVisible();
      await expect(
        page.locator(`text=${app.description}`).first(),
      ).toBeVisible();
    }
  });
  // test('click app opens a new tab', async ({ page }) => {
  //   const newTabPromise = page.waitForEvent('popup');

  //   const app = page.locator(`text=${samlApps[0].name}`).first();
  //   await app.click();

  //   const newTab = await newTabPromise;
  //   await newTab.waitForLoadState();

  //   await expect(newTab).toHaveURL(samlApps[0].samlSettings.idpInitiatedUrl);
  // });
});
