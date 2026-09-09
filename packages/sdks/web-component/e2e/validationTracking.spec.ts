import { expect } from '@playwright/test';
import { test } from './fixtures/cspFixture.js';

// Live-browser cover for the per-flow validation-tracking switch. The jsdom
// tests prove the wiring; this proves it in a real engine, with real
// ValidityState and a real request going out (or not).

const componentsVersion = '1.2.3';

// Must match the flow-id the demo page renders, or getFlowConfig resolves to an
// empty object and every flag reads as off.
const DEMO_FLOW_ID = 'sign-up-or-in';

const configFor = (flowConfig: Record<string, unknown>) => ({
  flows: { [DEMO_FLOW_ID]: { version: 1, ...flowConfig } },
  componentsVersion,
});

const setupRoutes = async (page, flowConfig: Record<string, unknown>) => {
  await page.route('*/**/config.json', async (route) =>
    route.fulfill({ json: configFor(flowConfig) }),
  );

  await page.route('*/**/theme.json', async (route) =>
    route.fulfill({
      json: {
        light: { globals: '', components: {} },
        dark: { globals: '', components: {} },
      },
    }),
  );

  // The screen carries a real required email input, so validity and
  // validationMessage come from the browser rather than from a stub.
  await page.route('*/**/*.html', async (route) =>
    route.fulfill({
      body: `<form><input name="email" type="email" required /></form>`,
    }),
  );

  await page.route(
    new RegExp(`.*\\/@descope\\/web-components-ui@${componentsVersion}/`),
    async (route) => {
      const filePath = route
        .request()
        .url()
        .replace(new RegExp(`.*@${componentsVersion}`), '');
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
          state: { project: { name: 'Nir-test' } },
        },
        stepName: 'Sign In',
      },
    }),
  );

  // Record every validation-event request the component makes.
  const events: any[] = [];
  await page.route('**/v1/flow/event', async (route) => {
    events.push(JSON.parse(route.request().postData() || '{}'));
    return route.fulfill({ status: 200, json: {} });
  });

  await page.goto('http://localhost:5565');
  await expect(page.locator('descope-wc').first()).toBeVisible();
  return events;
};

// Drives the component the way a failed submit does: hand it a real invalid
// input from the live DOM, then force the flush that a page-hide would.
const reportRealValidationFailure = (page) =>
  page.evaluate(() => {
    const input = document.createElement('input');
    input.setAttribute('name', 'email');
    input.type = 'email';
    input.required = true;
    input.value = 'john.doe';
    document.body.appendChild(input);
    input.checkValidity();

    const el = document.querySelector('descope-wc') as any;
    el.trackValidationErrors([input], {
      executionId: 'pass|#|2tlLFAOthDriBZIOVXahmLnYv8Q',
      stepId: '4',
      stepName: 'Sign In',
    });
    window.dispatchEvent(new Event('pagehide'));
    return input.validationMessage;
  });

test.describe('client-side validation tracking', () => {
  test('sends events when the flow config enables it', async ({ page }) => {
    const events = await setupRoutes(page, {
      clientValidationTrackingEnabled: true,
    });

    const validationMessage = await reportRealValidationFailure(page);
    await expect.poll(() => events.length).toBe(1);

    const [batch] = events;
    expect(batch.executionId).toBe('pass|#|2tlLFAOthDriBZIOVXahmLnYv8Q');
    expect(batch.events).toHaveLength(1);
    expect(batch.events[0].field).toBe('email');
    expect(batch.events[0].rule).toBe('format');
    expect(batch.events[0].screen).toBe('Sign In');
    // The message is whatever the browser showed the user.
    expect(batch.events[0].message).toBe(validationMessage);
  });

  test('sends nothing when the flow config omits the flag', async ({
    page,
  }) => {
    const events = await setupRoutes(page, {});

    await reportRealValidationFailure(page);
    // Give a real flush window before concluding nothing was sent.
    await page.waitForTimeout(3000);

    expect(events).toHaveLength(0);
  });
});
