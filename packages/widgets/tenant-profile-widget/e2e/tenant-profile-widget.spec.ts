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
    enforceSSOExclusions: ['newuser@example.com', 'admin@example.com'],
  };

  const mockTenantAfterDelete = {
    ...mockTenant,
    selfProvisioningDomains: [],
    enforceSSO: false,
    enforceSSOExclusions: [],
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
      {
        name: 'tenant-force-sso-exclusions-edit',
        action: 'edit',
        newValue: ['newuser@example.com', 'admin@example.com'],
        modalName: 'edit-tenant-sso-exclusions',
      },
      {
        name: 'tenant-force-sso-exclusions-edit',
        action: 'delete',
        newValue: '',
        modalName: 'delete-tenant-sso-exclusions',
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

  test.describe('sso exclusion list persistence', () => {
    test('added email should persist in form data when reopening edit modal', async ({
      page,
    }) => {
      await page.waitForTimeout(STATE_TIMEOUT);

      const userAttr = page
        .locator(
          `descope-user-attribute[data-id="tenant-force-sso-exclusions-edit"]`,
        )
        .first();

      const editBtn = userAttr
        .locator(`descope-button[data-id="edit-btn"]`)
        .first();

      // Click edit button to open modal
      await editBtn.click();
      await page.waitForTimeout(MODAL_TIMEOUT);

      const modal = page.locator(
        `descope-modal[data-id="edit-tenant-sso-exclusions"]`,
      );

      // Add a new email to the exclusion list
      const newEmail = 'newemail@example.com';

      // Simulate adding the email through the flow (this would be done via the descope-wc component)
      // For now, we'll finish the flow which should trigger the update
      const finishFlowBtn = modal.locator('button', { hasText: 'Finish Flow' });

      const mockTenantWithNewEmail = {
        ...mockTenant,
        enforceSSOExclusions: [...mockTenant.enforceSSOExclusions, newEmail],
      };

      await page.route('**/mgmt/tenant?**', async (route) =>
        route.fulfill({
          json: mockTenantWithNewEmail,
        }),
      );

      await finishFlowBtn.click();
      await page.waitForTimeout(MODAL_TIMEOUT);

      // Assert that the new email appears in the attribute value
      const expectedValue =
        mockTenantWithNewEmail.enforceSSOExclusions.join(',');
      await expect(userAttr).toHaveAttribute('value', expectedValue);

      // Click edit again to reopen the modal
      await editBtn.click();
      await page.waitForTimeout(MODAL_TIMEOUT);

      // Verify that the descope-wc component was recreated with the updated form data
      // Check the form attribute on descope-wc to ensure it contains the new email
      const descopeWc = modal.locator('descope-wc');
      const formAttr = await descopeWc.getAttribute('form');

      // Parse the form JSON and verify it contains the updated exclusions
      const formData = JSON.parse(formAttr || '{}');
      expect(formData.enforceSSOExclusions).toContain(newEmail);
      expect(formData.enforceSSOExclusions).toEqual(
        mockTenantWithNewEmail.enforceSSOExclusions,
      );
    });
  });
});
