/**
 * @jest-environment node
 *
 * playwright.config imports @playwright/test, which is node-only, while this
 * package's jest preset is jsdom - hence the environment override above.
 */
import { checkPlaywrightConfig } from '@descope/e2e-helpers';

// Seed the ports so importing the config is deterministic: getWidgetTestPorts
// reuses these when present instead of generating random ones.
process.env.PLAYWRIGHT_COMPONENTS_PORT ??= '3001';
process.env.PLAYWRIGHT_WIDGET_PORT ??= '3002';

// eslint-disable-next-line import/first
import config from '../playwright.config';

describe('playwright config', () => {
  it('keeps its e2e invariants', () => {
    // A ratchet, not a target: retries may go down and workers may go up, but
    // not the reverse. Update these numbers in the same commit that improves
    // them. Today's values for this package are retries=1, workers=4.
    expect(() =>
      checkPlaywrightConfig(config, {
        maxRetries: 1,
        minWorkers: 4,
      }),
    ).not.toThrow();
  });
});
