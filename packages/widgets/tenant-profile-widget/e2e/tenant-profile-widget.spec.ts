import { expect, test } from '@playwright/test';
import { mockTenant, mockTenantAdminLinkSSO } from '../test/mocks/mockTenant';
import mockTheme from '../test/mocks/mockTheme';
import { mockUser } from '../test/mocks/mockUser';
import rootMock from '../test/mocks/rootMock';

const configContent = {
  flows: {
    flow1: { version: 1 },
  },
  componentsVersion: '1.2.3',
};

const MODAL_TIMEOUT = 500;
const STATE_TIMEOUT = 2000;

test.describe('tenant profile widget', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'base.ui.components.url',
        'http://localhost:8770/umd/index.js',
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
    });

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

    await page.route('**/mgmt/tenant?**', async (route) =>
      route.fulfill({
        json: mockTenant,
      }),
    );

    await page.route(
      '**/mgmt/tenant/adminlinks/sso/authenticated?**',
      async (route) =>
        route.fulfill({
          json: mockTenantAdminLinkSSO,
        }),
    );

    await page.route('**/auth/logout', async (route) =>
      route.fulfill({
        json: {},
      }),
    );

    await page.goto('http://localhost:5559');
    await page.waitForTimeout(STATE_TIMEOUT);
  });

  test.describe('tenant attributes', () => {
    // eslint-disable-next-line no-restricted-syntax
    for (const attr of [
      {
        name: 'tenant-name-edit',
        action: 'edit',
        newValue: 'New Name',
        editModalName: 'tenant-profile-set-name',
      },
      // {
      //   name: 'tenant-email-domains-edit',
      //   action: 'edit',
      //   newValue: 'example1.com,example2.com',
      //   editModalName: 'tenant-profile-set-email-domains',
      // },
      // {
      //   name: 'tenant-email-domains-edit',
      //   action: 'delete',
      //   newValue: '',
      //   editModalName: 'tenant-profile-set-email-domains',
      // },
      // {
      //   name: 'tenant-enforce-sso-edit',
      //   action: 'edit',
      //   newValue: 'true',
      //   editModalName: 'tenant-profile-set-enforce-sso',
      // },
      // { name: 'tenant-enforce-sso-edit', action: 'delete', newValue: '' },
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
          .locator(`descope-modal[data-id="${attr.editModalName}"]`)
          .locator('button', { hasText: 'Finish Flow' });

        await page.route('**/mgmt/tenant', async (route) =>
          route.fulfill({
            json: { ...mockTenant, [attr.name]: attr.newValue },
          }),
        );

        finishFlowBtn.click();

        await page.waitForTimeout(MODAL_TIMEOUT);

        await expect(userAttr).toHaveValue(attr.newValue);
      });
    }
  });

  test.describe('tenant admin sso configuration link', () => {
    test(`get tenant admin sso configuration link`, async ({ page }) => {
      await page.waitForTimeout(STATE_TIMEOUT);

      const userAttr = page
        .locator(`descope-link[data-id="tenant-admin-sso-configuration-link"]`)
        .first();

      await expect(userAttr).toHaveText('SSO Setup');

      await expect(userAttr).toHaveAttribute(
        'href',
        mockTenantAdminLinkSSO.adminSSOConfigurationLink,
      );
    });
  });
});
