import { expect, test } from '@playwright/test';
import { componentsPort, widgetPort } from '../playwright.config';
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

    await page.goto(`http://localhost:${widgetPort}`);
    await page.waitForTimeout(STATE_TIMEOUT);
  });

  const mockTenantAfterEdit = {
    ...mockTenant,
    name: 'New Name',
    selfProvisioningDomains: ['newDomain.com', 'example2.com'],
    enforceSSO: false,
  };

  const mockTenantAfterDelete = {
    ...mockTenant,
    selfProvisioningDomains: [],
    enforceSSO: false,
  };

  test.describe('tenant attributes', () => {
    // eslint-disable-next-line no-restricted-syntax
    for (const attr of [
      {
        name: 'tenant-name-edit',
        action: 'edit',
        newValue: 'New Name',
        modalName: 'tenant-profile-set-name',
      },
      {
        name: 'tenant-email-domains-edit',
        action: 'edit',
        newValue: ['newDomain.com', 'example2.com'],
        modalName: 'edit-tenant-email-domains',
      },
      {
        name: 'tenant-email-domains-edit',
        action: 'delete',
        newValue: '',
        modalName: 'delete-tenant-email-domains',
      },
      {
        name: 'tenant-enforce-sso-edit',
        action: 'edit',
        newValue: 'false',
        modalName: 'edit-tenant-enforce-sso',
      },
      {
        name: 'tenant-enforce-sso-edit',
        action: 'delete',
        newValue: 'false',
        modalName: 'delete-tenant-enforce-sso',
      },
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
          .locator(`descope-modal[data-id="${attr.modalName}"]`)
          .locator('button', { hasText: 'Finish Flow' });

        await page.route('**/mgmt/tenant?**', async (route) =>
          route.fulfill({
            json:
              attr.action === 'edit'
                ? mockTenantAfterEdit
                : mockTenantAfterDelete,
          }),
        );

        finishFlowBtn.click();

        await page.waitForTimeout(MODAL_TIMEOUT);

        // eslint-disable-next-line jest-dom/prefer-to-have-value
        await expect(userAttr).toHaveAttribute(
          'value',
          attr.newValue.toString(),
        );
      });
    }
  });

  test.describe('tenant admin sso configuration link', () => {
    test('get tenant admin sso configuration link', async ({ page }) => {
      await page.waitForTimeout(STATE_TIMEOUT);

      const userAttr = page
        .locator(`descope-link[data-id="tenant-admin-link-sso"]`)
        .first();

      await expect(userAttr).toHaveText('SSO Setup');

      await expect(userAttr).toHaveAttribute(
        'href',
        mockTenantAdminLinkSSO.adminSSOConfigurationLink,
      );
    });
  });
});
