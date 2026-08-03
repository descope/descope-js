import { expect } from '@playwright/test';
import { test } from './fixtures/cspFixture.js';

const configContent = {
  flows: {
    flow1: { version: 1 },
  },
  componentsVersion: '1.2.3',
};

test.describe('descope-wc', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('*/**/config.json', async (route) =>
      route.fulfill({ json: configContent }),
    );

    await page.route('*/**/theme.json', async (route) =>
      route.fulfill({
        json: {
          light: {
            globals: '',
            components: {},
          },
          dark: {
            globals: '',
            components: {},
          },
        },
      }),
    );

    await page.route('*/**/*.html', async (route) =>
      route.fulfill({ body: `<div>123</div>` }),
    );

    await page.route(
      new RegExp(
        `.*\/@descope\/web-components-ui@${configContent.componentsVersion}/`,
      ),
      async (route) => {
        const filePath = route
          .request()
          .url()
          .replace(new RegExp(`.*@${configContent.componentsVersion}`), '');
        return route.fulfill({
          path: require.resolve('@descope/web-components-ui' + filePath),
        });
      },
    );

    await page.route('**/start', async (route) =>
      route.fulfill({
        json: {
          executionId: 'pass---2tlLFAOthDriBZIOVXahmLnYv8Q',
          stepId: '4',
          status: 'waiting',
          action: '',
          screen: {
            id: 'pass/SC2sIjJonbfhE16bTzi1ZWZIlUCsu',
            state: {
              project: {
                name: 'Nir-test',
              },
            },
          },
          stepName: 'Sign In',
        },
      }),
    );

    await page.goto('http://localhost:5565');
  });

  test('init', async ({ page }) => {
    await expect(page.locator(`descope-wc`).first()).toBeVisible();
  });
});
