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

    await page.route('**/v1/mgmt/user/passkeys/list', async (route) =>
      route.fulfill({
        json: { passkeys: [] },
      }),
    );

    await page.goto(`http://localhost:${widgetPort}`);
    await page.waitForTimeout(STATE_TIMEOUT);
  });

  test('avatar', async ({ page }) => {
    await page.waitForTimeout(STATE_TIMEOUT);

    const avatar = page.locator('descope-avatar').first();

    await avatar.click();

    await page.waitForTimeout(MODAL_TIMEOUT);

    const finishFlowBtn = page
      .locator('descope-modal[data-id="update-pic"]')
      .locator('button', { hasText: 'Finish Flow' });

    await page.route('**/auth/me', async (route) =>
      route.fulfill({
        json: { ...mockUser, picture: 'https://example.com/avatar.jpg' },
      }),
    );

    await finishFlowBtn.click();

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

  test.describe('generic flow button', () => {
    const FLOW_ID = 'my-test-flow';
    const genericFlowButtonRoot = `<descope-button data-generic-flow-button-id="test-btn" flow-id="${FLOW_ID}">Run Flow</descope-button>`;

    test.beforeEach(async ({ page }) => {
      await page.route('**/root.html', async (route) =>
        route.fulfill({ body: genericFlowButtonRoot }),
      );
      await page.goto(`http://localhost:${widgetPort}`);
      await page.waitForTimeout(STATE_TIMEOUT);
    });

    test('discovers [data-generic-flow-button-id] and enables it on init', async ({
      page,
    }) => {
      const button = page.locator('[data-generic-flow-button-id]').first();
      await expect(button).toBeVisible();
      await expect(button).not.toHaveAttribute('disabled');
    });

    test('sets correct flow-id and client.userId on descope-wc when button is clicked', async ({
      page,
    }) => {
      await page.locator('[data-generic-flow-button-id]').first().click();
      await page.waitForTimeout(MODAL_TIMEOUT);

      const descopeWc = page
        .locator('descope-modal[data-id="generic-flow-modal"]')
        .locator('descope-wc');
      await expect(descopeWc).toBeAttached();
      await expect(descopeWc).toHaveAttribute('flow-id', FLOW_ID);
      await expect(descopeWc).toHaveAttribute('project-id', /.+/);

      const clientAttr = await descopeWc.getAttribute('client');
      const client = JSON.parse(clientAttr ?? '{}');
      expect(client.userId).toBe(mockUser.userId);
    });

    test('forwards caller client/form flow inputs into descope-wc', async ({
      page,
    }) => {
      // a consumer sets client/form on the widget element; read lazily at flow open
      await page.evaluate(() => {
        const widget = document.querySelector('descope-user-profile-widget');
        widget.setAttribute('client', JSON.stringify({ acme: 'corp' }));
        widget.setAttribute(
          'form',
          JSON.stringify({ cookieName: 'DSR_wellsense' }),
        );
      });

      await page.locator('[data-generic-flow-button-id]').first().click();
      await page.waitForTimeout(MODAL_TIMEOUT);

      const descopeWc = page
        .locator('descope-modal[data-id="generic-flow-modal"]')
        .locator('descope-wc');
      await expect(descopeWc).toBeAttached();

      // caller form is forwarded into the flow as-is
      await expect(descopeWc).toHaveAttribute(
        'form',
        JSON.stringify({ cookieName: 'DSR_wellsense' }),
      );

      // caller client is merged with the widget's own flow context (userId)
      const client = JSON.parse(
        (await descopeWc.getAttribute('client')) ?? '{}',
      );
      expect(client).toMatchObject({ acme: 'corp' });
      expect(client.userId).toBe(mockUser.userId);
    });

    test('opens the modal when descope-wc fires page-updated', async ({
      page,
    }) => {
      await page.locator('[data-generic-flow-button-id]').first().click();
      await page.waitForTimeout(MODAL_TIMEOUT);

      await page
        .locator('descope-modal[data-id="generic-flow-modal"]')
        .locator('descope-wc')
        .dispatchEvent('page-updated');
      await page.waitForTimeout(MODAL_TIMEOUT);

      await expect(
        page.locator('descope-modal[data-id="generic-flow-modal"]'),
      ).toHaveAttribute('opened');
    });

    test('calls getMe action when descope-wc fires success', async ({
      page,
    }) => {
      await page.locator('[data-generic-flow-button-id]').first().click();
      await page.waitForTimeout(MODAL_TIMEOUT);

      const getMeRequest = page.waitForRequest(
        (req) => req.url().includes('/auth/me') && req.method() === 'GET',
      );

      await page
        .locator('descope-modal[data-id="generic-flow-modal"]')
        .locator('descope-wc')
        .dispatchEvent('success');

      await getMeRequest;
    });
  });

  test.describe('passkeys', () => {
    test.use({ timezoneId: 'UTC' });

    const passkeysResponse = {
      passkeys: [
        {
          id: 'pk-1',
          displayName: 'iPhone',
          kind: 'apple',
          createdTime: 1735977600,
          rpId: 'example.com',
        },
        {
          id: 'pk-2',
          displayName: 'Chrome',
          kind: 'google',
          createdTime: 1738750500,
          rpId: 'example.com',
        },
      ],
    };

    test('fetches passkeys on init with the user loginId', async ({ page }) => {
      const passkeysReq = page.waitForRequest(
        (req) =>
          req.url().includes('/v1/mgmt/user/passkeys/list') &&
          req.method() === 'POST',
      );

      await page.goto(`http://localhost:${widgetPort}`);
      const req = await passkeysReq;

      expect(JSON.parse(req.postData() ?? '{}')).toEqual({
        loginId: mockUser.userId,
      });
    });

    test('renders a row per passkey with name, date, and id', async ({
      page,
    }) => {
      await page.route('**/v1/mgmt/user/passkeys/list', async (route) =>
        route.fulfill({ json: passkeysResponse }),
      );

      await page.goto(`http://localhost:${widgetPort}`);
      await page.waitForTimeout(STATE_TIMEOUT);

      const passkeysEl = page.locator('descope-user-passkeys').first();

      await expect(passkeysEl.getByText('iPhone')).toBeVisible();
      await expect(passkeysEl.getByText('01/04/2025 08:00')).toBeVisible();
      await expect(
        passkeysEl.locator('[data-passkey-id="pk-1"]'),
      ).toBeAttached();

      await expect(passkeysEl.getByText('Chrome')).toBeVisible();
      await expect(passkeysEl.getByText('02/05/2025 10:15')).toBeVisible();
      await expect(
        passkeysEl.locator('[data-passkey-id="pk-2"]'),
      ).toBeAttached();
    });
  });

  test.describe('badge visibility', () => {
    test('should show "Unverified" badge when email exists and is not verified', async ({
      page,
    }) => {
      await page.route('**/auth/me', async (route) =>
        route.fulfill({
          json: {
            ...mockUser,
            email: 'test@example.com',
            verifiedEmail: false,
          },
        }),
      );

      await page.goto(`http://localhost:${widgetPort}`);
      await page.waitForTimeout(STATE_TIMEOUT);

      const badge = page
        .locator('descope-user-attribute[data-id="email"]')
        .locator('descope-badge');
      await expect(badge).toBeVisible();
    });

    test('should not show "Unverified" badge when email is empty', async ({
      page,
    }) => {
      await page.route('**/auth/me', async (route) =>
        route.fulfill({
          json: { ...mockUser, email: '', verifiedEmail: false },
        }),
      );

      await page.goto(`http://localhost:${widgetPort}`);
      await page.waitForTimeout(STATE_TIMEOUT);

      const badge = page
        .locator('descope-user-attribute[data-id="email"]')
        .locator('descope-badge');
      await expect(badge).toBeHidden();
    });

    test('should not show "Unverified" badge when email is verified', async ({
      page,
    }) => {
      await page.route('**/auth/me', async (route) =>
        route.fulfill({
          json: { ...mockUser, email: 'test@example.com', verifiedEmail: true },
        }),
      );

      await page.goto(`http://localhost:${widgetPort}`);
      await page.waitForTimeout(STATE_TIMEOUT);

      const badge = page
        .locator('descope-user-attribute[data-id="email"]')
        .locator('descope-badge');
      await expect(badge).toBeHidden();
    });

    test('should show "Unverified" badge when phone exists and is not verified', async ({
      page,
    }) => {
      await page.route('**/auth/me', async (route) =>
        route.fulfill({
          json: { ...mockUser, phone: '+1234567890', verifiedPhone: false },
        }),
      );

      await page.goto(`http://localhost:${widgetPort}`);
      await page.waitForTimeout(STATE_TIMEOUT);

      const badge = page
        .locator('descope-user-attribute[data-id="phone"]')
        .locator('descope-badge');
      await expect(badge).toBeVisible();
    });

    test('should not show "Unverified" badge when phone is empty', async ({
      page,
    }) => {
      await page.route('**/auth/me', async (route) =>
        route.fulfill({
          json: { ...mockUser, phone: '', verifiedPhone: false },
        }),
      );

      await page.goto(`http://localhost:${widgetPort}`);
      await page.waitForTimeout(STATE_TIMEOUT);

      const badge = page
        .locator('descope-user-attribute[data-id="phone"]')
        .locator('descope-badge');
      await expect(badge).toBeHidden();
    });

    test('should not show "Unverified" badge when phone is verified', async ({
      page,
    }) => {
      await page.route('**/auth/me', async (route) =>
        route.fulfill({
          json: { ...mockUser, phone: '+1234567890', verifiedPhone: true },
        }),
      );

      await page.goto(`http://localhost:${widgetPort}`);
      await page.waitForTimeout(STATE_TIMEOUT);

      const badge = page
        .locator('descope-user-attribute[data-id="phone"]')
        .locator('descope-badge');
      await expect(badge).toBeHidden();
    });
  });
});
