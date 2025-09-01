import { test, expect } from '@playwright/test';
import { componentsPort, widgetPort } from '../playwright.config';
import { mockUser } from '../test/mocks/mockUser';
import mockTheme from '../test/mocks/mockTheme';
import rootMock from '../test/mocks/rootMock';

const configContent = {
  flows: {
    flow1: { version: 1 },
  },
  componentsVersion: '1.2.3',
};

const MODAL_TIMEOUT = 500;
const STATE_TIMEOUT = 2000;

test.describe('widget', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((port) => {
      window.localStorage.setItem(
        'base.ui.components.url',
        `http://localhost:${port}/umd/index.js`,
      );

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

    await page.route('**/auth/logout', async (route) =>
      route.fulfill({
        json: {},
      }),
    );

    await page.goto(`http://localhost:${widgetPort}`);
    await page.waitForTimeout(STATE_TIMEOUT);
  });

  test('avatar', async ({ page }) => {
    await page.waitForTimeout(STATE_TIMEOUT);

    const avatar = page.locator('descope-avatar').first();

    avatar.click();

    await page.waitForTimeout(MODAL_TIMEOUT);

    const finishFlowBtn = page
      .locator('descope-modal[data-id="update-pic"]')
      .locator('button', { hasText: 'Finish Flow' });

    await page.route('**/auth/me', async (route) =>
      route.fulfill({
        json: { ...mockUser, picture: 'https://example.com/avatar.jpg' },
      }),
    );

    finishFlowBtn.click();

    await page.waitForTimeout(STATE_TIMEOUT);

    expect(await avatar.getAttribute('img')).toBe(
      'https://example.com/avatar.jpg',
    );
  });

  test('logout', async ({ page }) => {
    await page.waitForTimeout(STATE_TIMEOUT);

    const logout = page.locator('descope-button[data-id="logout"]').first();

    let isLoggedOut = false;

    page.on('request', (request) => {
      if (request.url().endsWith('/auth/logout')) {
        isLoggedOut = true;
      }
    });

    logout.click();

    await page.waitForTimeout(STATE_TIMEOUT);

    expect(isLoggedOut).toBe(true);
  });
  test.describe('user attributes', () => {
    // eslint-disable-next-line no-restricted-syntax
    for (const attr of [
      { name: 'email', action: 'edit', newValue: 'bla@bla.com' },
      { name: 'email', action: 'delete', newValue: '' },
      { name: 'name', action: 'edit', newValue: 'New Name' },
      { name: 'name', action: 'delete', newValue: '' },
      { name: 'phone', action: 'edit', newValue: '+9721234567' },
      { name: 'phone', action: 'delete', newValue: '' },
    ]) {
      test(`${attr.action} ${attr.name}`, async ({ page }) => {
        await page.waitForTimeout(STATE_TIMEOUT);

        const userAttr = page
          .locator(`descope-user-attribute[data-id="${attr.name}"]`)
          .first();

        const editBtn = userAttr
          .locator(`descope-button[data-id="${attr.action}-btn"]`)
          .first();

        editBtn.click();

        await page.waitForTimeout(MODAL_TIMEOUT);

        const finishFlowBtn = page
          .locator(`descope-modal[data-id="${attr.action}-${attr.name}"]`)
          .locator('button', { hasText: 'Finish Flow' });

        await page.route('**/auth/me', async (route) =>
          route.fulfill({
            json: { ...mockUser, [attr.name]: attr.newValue },
          }),
        );

        finishFlowBtn.click();

        await page.waitForTimeout(MODAL_TIMEOUT);

        await expect(userAttr).toHaveAttribute('value', attr.newValue);
      });
    }
  });

  test.describe('user auth methods', () => {
    // eslint-disable-next-line no-restricted-syntax
    for (const attr of [
      {
        name: 'passkey',
        action: 'add',
        flagPath: 'webauthn',
        fulfilled: 'true',
      },
      { name: 'password', flagPath: 'password', fulfilled: null },
      { name: 'totp', flagPath: 'TOTP', fulfilled: 'true' },
    ]) {
      test(`${attr.name}`, async ({ page }) => {
        await page.waitForTimeout(STATE_TIMEOUT);

        const userAttr = page
          .locator(`descope-user-auth-method[data-id="${attr.name}"]`)
          .first();

        const editBtn = userAttr.locator(`descope-button`).first();

        editBtn.click();

        await page.waitForTimeout(MODAL_TIMEOUT);

        await page.route('**/auth/me', async (route) =>
          route.fulfill({
            json: { ...mockUser, [attr.flagPath]: true },
          }),
        );

        const finishFlowBtn = page
          .locator(
            `descope-modal[data-id="${attr.action ? attr.action + '-' : ''}${
              attr.name
            }"]`,
          )
          .locator('button', { hasText: 'Finish Flow' });

        await finishFlowBtn.waitFor({ state: 'visible' });

        finishFlowBtn.click();

        await page.waitForTimeout(MODAL_TIMEOUT);

        if (attr.fulfilled !== null) {
          await expect(userAttr).toHaveAttribute('fulfilled', attr.fulfilled);
        } else {
          await expect(userAttr).not.toHaveAttribute('fulfilled');
        }
      });
    }
  });
});
