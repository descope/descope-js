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
          executionId: 'pass|#|2tlLFAOthDriBZIOVXahmLnYv8Q',
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

  test('sends a screen-attached client script result on the next call', async ({
    page,
  }) => {
    // Guards the wiring, not the collector itself: a screen carries a
    // clientScripts entry, the SDK loads that script, and whatever the script
    // reports ends up in the next call under sdkScriptsResults.<id>_<resultKey>.
    // The collector's own behaviour is covered by its unit tests in the content
    // repo, so this serves a stub rather than reaching across repositories.
    const scriptId = 'clientSignals';
    const resultKey = 'signals';
    const reported = JSON.stringify({ v: 1, stub: true });

    await page.route(
      `**/@descope/flow-scripts@*/dist/${scriptId}.js`,
      (route) =>
        route.fulfill({
          contentType: 'application/javascript',
          body: `
          globalThis.descope = globalThis.descope || {};
          globalThis.descope['${scriptId}'] = function (initArgs, inputs, onTokenReady) {
            onTokenReady(null);
            return {
              id: '${scriptId}',
              start: function () {},
              stop: function () { return false; },
              refresh: function () { onTokenReady(${JSON.stringify(
                reported,
              )}); },
            };
          };
        `,
        }),
    );

    await page.route('*/**/*.html', (route) =>
      route.fulfill({
        body: `<descope-button type="button" id="interactionId">Click</descope-button>`,
      }),
    );

    await page.route('**/start', (route) =>
      route.fulfill({
        json: {
          executionId: 'pass|#|2tlLFAOthDriBZIOVXahmLnYv8Q',
          stepId: '4',
          status: 'waiting',
          action: '',
          screen: {
            id: 'pass/SC2sIjJonbfhE16bTzi1ZWZIlUCsu',
            state: {
              project: { name: 'Nir-test' },
              clientScripts: [{ id: scriptId, initArgs: {}, resultKey }],
            },
          },
          stepName: 'Sign In',
        },
      }),
    );

    let nextBody: Record<string, any> | undefined;
    await page.route('**/next', (route) => {
      nextBody = route.request().postDataJSON();
      route.fulfill({
        json: {
          executionId: 'pass|#|2tlLFAOthDriBZIOVXahmLnYv8Q',
          stepId: '5',
          status: 'completed',
          action: '',
        },
      });
    });

    await page.reload();

    const button = page.locator('descope-wc').first().locator('descope-button');
    await button.click();

    await expect
      .poll(
        () => nextBody?.input?.[`sdkScriptsResults.${scriptId}_${resultKey}`],
      )
      .toBe(reported);
  });
});
