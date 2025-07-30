import { expect, test } from '@playwright/test';
import { componentsPort } from '../playwright.config';

import mockTheme from '../test/mocks/mockTheme';
import { apiPaths } from '../src/lib/widget/api/apiPaths';
import rootMock from '../test/mocks/rootMock';
import {
  mockConnectedApps,
  mockOutboundApps,
  mockUser,
} from '../test/mocks/mockOutboundApps';

const MODAL_TIMEOUT = 500;
const STATE_TIMEOUT = 2000;

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
    await page.addInitScript((port) => {
      window.localStorage.setItem(
        'base.ui.components.url',
        `http://localhost:${port}/umd/index.js`,
      ),
        window.customElements.define(
          'descope-wc',
          class extends HTMLElement {
            connectedCallback() {
              this.innerHTML = '<button>Finish Flow</button>';
              this.querySelector('button').onclick = () => {
                this.dispatchEvent(new CustomEvent('success'));
              };
            }
          },
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

    await page.route('**/auth/me', async (route) =>
      route.fulfill({
        json: mockUser,
      }),
    );

    await page.route(
      apiPath('outboundApps', 'allOutboundApps'),
      async (route) =>
        route.fulfill({
          json: mockOutboundApps,
        }),
    );

    await page.route(
      apiPath('outboundApps', 'connectedOutboundApps') +
        `?userId=${mockUser.userId}`,
      async (route) =>
        route.fulfill({
          json: mockConnectedApps,
        }),
    );

    await page.goto('/');
  });

  test('apps are in the list', async ({ page }) => {
    for (const app of mockOutboundApps.apps) {
      await expect(page.locator(`text=${app.name}`).first()).toBeVisible();
      await expect(
        page.locator(`text=${app.description}`).first(),
      ).toBeVisible();
    }
  });

  test.describe('controls', () => {
    test('app connect', async ({ page }) => {
      const connectBtn = page
        .locator('descope-list-item')
        .nth(1)
        .getByText('Connect');
      await connectBtn.click();

      await page.waitForTimeout(MODAL_TIMEOUT);

      await page.route(
        apiPath('outboundApps', 'connectedOutboundApps') +
          `?userId=${mockUser.userId}`,
        async (route) =>
          route.fulfill({
            json: { appIds: ['obapp1', 'obapp2'] },
          }),
      );

      const finishFlowBtn = page
        .locator('descope-modal[data-id="outbound-apps-connect"]')
        .locator('button', { hasText: 'Finish Flow' });

      finishFlowBtn.click();

      await page.waitForTimeout(STATE_TIMEOUT);

      const disconnectBtn = page
        .locator('descope-list-item')
        .nth(1)
        .getByText('Disconnect');
      expect(disconnectBtn).toBeVisible();
    });

    test('app disconnect', async ({ page }) => {
      const disconnectBtn = page
        .locator('descope-list-item')
        .first()
        .getByText('Disconnect');
      await disconnectBtn.click();

      await page.waitForTimeout(MODAL_TIMEOUT);

      await page.route(
        apiPath('outboundApps', 'connectedOutboundApps') +
          `?userId=${mockUser.userId}`,
        async (route) =>
          route.fulfill({
            json: { appIds: [] },
          }),
      );

      const finishFlowBtn = page
        .locator('descope-modal[data-id="outbound-apps-disconnect"]')
        .locator('button', { hasText: 'Finish Flow' });

      finishFlowBtn.click();

      await page.waitForTimeout(STATE_TIMEOUT);

      const connectBtn = page
        .locator('descope-list-item')
        .first()
        .getByText('Connect');
      expect(connectBtn).toBeVisible();
    });
  });

  test.describe('filter allowed apps', () => {
    test('filter by id', async ({ page }) => {
      const allowedApp = mockOutboundApps.apps[0];

      await page.evaluate((app) => {
        const widget = document.querySelector(
          'descope-outbound-applications-widget',
        );
        widget?.setAttribute('allowed-outbound-apps-ids', app.id);
      }, allowedApp);

      await page.waitForTimeout(STATE_TIMEOUT);

      // Validate first app is visible
      await expect(
        page.locator(`text=${allowedApp.name}`).first(),
      ).toBeVisible();
      await expect(
        page.locator(`text=${allowedApp.description}`).first(),
      ).toBeVisible();

      // Validate all other apps are not visible
      for (let i = 1; i < mockOutboundApps.apps.length; i++) {
        const app = mockOutboundApps.apps[i];
        await expect(page.locator(`text=${app.name}`)).not.toBeVisible();
        await expect(page.locator(`text=${app.description}`)).not.toBeVisible();
      }
    });

    test('empty value filters all apps', async ({ page }) => {
      await page.evaluate(() => {
        const widget = document.querySelector(
          'descope-outbound-applications-widget',
        );
        widget?.setAttribute('allowed-outbound-apps-ids', '');
      });

      await page.waitForTimeout(STATE_TIMEOUT);

      // Validate all apps are not visible
      for (let i = 0; i < mockOutboundApps.apps.length; i++) {
        const app = mockOutboundApps.apps[i];
        await expect(page.locator(`text=${app.name}`)).not.toBeVisible();
        await expect(page.locator(`text=${app.description}`)).not.toBeVisible();
      }
    });
  });
});
