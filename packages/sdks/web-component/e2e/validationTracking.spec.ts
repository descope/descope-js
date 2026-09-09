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

  // A screen shaped like a real one: a required email field and a submit
  // button. [data-type="button"] is what #hydrate binds to, so clicking it goes
  // through the component's own #handleSubmit -> #validateInputs path, exactly
  // as a user pressing the button does.
  await page.route('*/**/*.html', async (route) =>
    route.fulfill({
      body: `<input name="email" type="email" required />
             <button data-type="button" id="submit-btn">Continue</button>`,
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

// What a user does: type an address that isn't one, then press the button.
// Nothing here reaches into the component - the component runs its own
// validation, blocks the submit, and decides on its own to report.
const typeBadEmailAndSubmit = async (page) => {
  await page.locator('input[name="email"]').fill('john.doe');
  await page.locator('#submit-btn').click();
};

test.describe('client-side validation tracking', () => {
  test('sends events when the flow config enables it', async ({ page }) => {
    const events = await setupRoutes(page, {
      clientValidationTrackingEnabled: true,
    });

    await typeBadEmailAndSubmit(page);

    // The batch leaves on the component's own inactivity flush, no nudging.
    await expect.poll(() => events.length, { timeout: 10000 }).toBe(1);

    const [batch] = events;
    expect(batch.executionId).toBe('pass|#|2tlLFAOthDriBZIOVXahmLnYv8Q');
    expect(batch.events).toHaveLength(1);
    expect(batch.events[0].field).toBe('email');
    expect(batch.events[0].rule).toBe('format');
    expect(batch.events[0].screen).toBe('Sign In');
    // The message is the exact text the browser showed the user.
    expect(batch.events[0].message).toBe(
      await page
        .locator('input[name="email"]')
        .evaluate((el: HTMLInputElement) => el.validationMessage),
    );
  });

  test('the invalid submit is blocked either way', async ({ page }) => {
    let nextCalled = false;
    await page.route('**/next', async (route) => {
      nextCalled = true;
      return route.fulfill({ json: {} });
    });
    const events = await setupRoutes(page, {
      clientValidationTrackingEnabled: true,
    });

    await typeBadEmailAndSubmit(page);
    await expect.poll(() => events.length, { timeout: 10000 }).toBe(1);

    // Tracking must not change what the flow does: the bad value never submits.
    expect(nextCalled).toBe(false);
  });

  test('sends nothing when the flow config omits the flag', async ({
    page,
  }) => {
    const events = await setupRoutes(page, {});

    await typeBadEmailAndSubmit(page);
    // Well past the component's own flush window.
    await page.waitForTimeout(5000);

    expect(events).toHaveLength(0);
  });
});
