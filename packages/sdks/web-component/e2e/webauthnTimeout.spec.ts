import { expect } from '@playwright/test';
import { test } from './fixtures/cspFixture.js';

// A passkey ceremony can stay pending for minutes when a password manager
// extension swallows the dismissal. These specs drive the real component with a
// browser call that never settles, which is the same shape as the reported bug.

const configContent = {
  flows: {
    flow1: { version: 1 },
  },
  componentsVersion: '1.2.3',
};

const SCREEN_HTML = `
  <descope-button id="passkey" data-type="biometrics">Sign in with passkey</descope-button>
  <descope-button id="fallback">Use password instead</descope-button>
`;

const screenResponse = (stepId: string) => ({
  executionId: 'pass|#|2tlLFAOthDriBZIOVXahmLnYv8Q',
  stepId,
  status: 'waiting',
  action: '',
  screen: { id: 'pass/SC1', state: {} },
  stepName: 'Sign In',
});

// A real challenge, otherwise decodeGetOptions throws before the browser call
// is ever made.
const ceremonyResponse = {
  executionId: 'pass|#|2tlLFAOthDriBZIOVXahmLnYv8Q',
  stepId: '2',
  status: 'waiting',
  action: 'webauthnGet',
  screen: { id: '', state: null },
  webauthn: {
    transactionId: 'tx-1',
    options: JSON.stringify({
      publicKey: {
        challenge: 'RCDjLZgO_tSVZOkFQEkn3-gVyTQ1nhdUd4i1aqf1J38',
        rpId: 'localhost',
      },
    }),
  },
};

test.describe('webauthn ceremony that never settles', () => {
  let nextBodies: string[];

  test.beforeEach(async ({ page }) => {
    nextBodies = [];

    await page.route('*/**/config.json', async (route) =>
      route.fulfill({ json: configContent }),
    );

    await page.route('*/**/theme.json', async (route) =>
      route.fulfill({
        json: {
          light: { globals: '', components: {} },
          dark: { globals: '', components: {} },
        },
      }),
    );

    await page.route('*/**/*.html', async (route) =>
      route.fulfill({ body: SCREEN_HTML }),
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

    // the flow starts on a normal screen, as it does in production
    await page.route('**/start', async (route) =>
      route.fulfill({ json: screenResponse('1') }),
    );

    // first next (the passkey click) asks the browser for a passkey;
    // anything after that is a normal screen
    await page.route('**/next', async (route) => {
      nextBodies.push(route.request().postData() || '');
      return route.fulfill({
        json: nextBodies.length === 1 ? ceremonyResponse : screenResponse('3'),
      });
    });

    // The browser never answers, which is what the extension bug looks like.
    // The flag lets a test wait until the ceremony has really begun - the 90s
    // timer is registered inside this call, so advancing the clock any earlier
    // would start it after the jump and it would never fire.
    await page.addInitScript(() => {
      (window as any).__ceremonyStarted = false;
      // Not every engine we test on exposes navigator.credentials (Linux WebKit
      // does not), and defining a property on undefined would throw and take the
      // whole init script with it.
      if (!navigator.credentials) {
        Object.defineProperty(navigator, 'credentials', {
          value: {},
          configurable: true,
          writable: true,
        });
      }
      Object.defineProperty(navigator.credentials, 'get', {
        value: () => {
          (window as any).__ceremonyStarted = true;
          return new Promise(() => {});
        },
        configurable: true,
        writable: true,
      });
    });
  });

  test('leaves the rest of the screen usable while the ceremony is pending', async ({
    page,
  }) => {
    await page.goto('http://localhost:5565');

    const passkey = page.locator('descope-button#passkey');
    const fallback = page.locator('descope-button#fallback');
    await expect(passkey).toBeVisible();

    await passkey.click();
    await expect.poll(() => nextBodies.length).toBe(1);

    // the passkey button keeps spinning, which is what stops a second ceremony
    await expect(passkey).toHaveAttribute('loading', 'true');

    // the escape route is usable again even though the call is still pending
    await expect(fallback).not.toHaveAttribute('disabled', 'true');
    // Clicking it is not asserted here: these mocked screens are plain markup
    // without the flow's form wiring, so a click never becomes a submit in this
    // fixture. That path is covered by the jest suite (which drives the real
    // form) and end to end against a real extension.
  });

  test('reports a timeout once the budget expires', async ({ page }) => {
    await page.clock.install();
    await page.goto('http://localhost:5565');

    const passkey = page.locator('descope-button#passkey');
    await expect(passkey).toBeVisible();
    await passkey.click();
    await expect.poll(() => nextBodies.length).toBe(1);

    // the ceremony must be underway before the clock jumps, otherwise its timer
    // is registered after the jump and never fires
    // generous timeouts: CI runs three engines at once and the default 5s poll
    // is not always enough on a loaded machine
    await expect
      .poll(() => page.evaluate(() => (window as any).__ceremonyStarted), {
        timeout: 20_000,
      })
      .toBe(true);

    // jump past the ceremony budget instead of waiting it out
    await page.clock.fastForward(95_000);

    await expect
      .poll(
        () => nextBodies.find((b) => b.includes('"failureReason":"aborted"')),
        {
          timeout: 20_000,
        },
      )
      .toBeTruthy();
  });
});
