import { expect } from '@playwright/test';
import { createWidgetFixtures } from '@descope/e2e-helpers';

import mockTheme from '../test/mocks/mockTheme';
import { apiPaths } from '../src/lib/widget/api/apiPaths';
import rootMock from '../test/mocks/rootMock';
import {
  mockConnectedApps,
  mockOutboundApps,
  mockUser,
} from '../test/mocks/mockOutboundApps';

const test = createWidgetFixtures('outbound-applications-portal-widget');

const configContent = {
  flows: {
    flow1: { version: 1 },
  },
  componentsVersion: '1.114.0',
};

const apiPath = (prop: 'outboundApps' | 'user', path: string) =>
  `**/*${apiPaths[prop][path]}`;

test.describe('widget', () => {
  test.beforeEach(async ({ page, componentsPort }) => {
    await page.addInitScript(
      (port) =>
        window.localStorage.setItem(
          'base.ui.components.url',
          `http://localhost:${port}/umd/index.js`,
        ),
      componentsPort,
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

    await page.route('**/auth/me', async (route) =>
      route.fulfill({
        json: mockUser,
      }),
    );

    await page.route(
      apiPath('outboundApps', 'getAllOutboundApps'),
      async (route) =>
        route.fulfill({
          json: mockOutboundApps,
        }),
    );

    await page.route(
      apiPath('outboundApps', 'getConnectedOutboundApps') +
        `?userId=${mockUser.userId}`,
      async (route) =>
        route.fulfill({
          json: mockConnectedApps,
        }),
    );

    await page.goto('/');
  });

  test('outbound apps are in the list', async ({ page }) => {
    for (const app of mockOutboundApps.apps) {
      await expect(page.locator(`text=${app.name}`).first()).toBeVisible();
      await expect(
        page.locator(`text=${app.description}`).first(),
      ).toBeVisible();
    }
  });
});
