/**
 * @jest-environment node
 *
 * playwright.config imports @playwright/test, which is node-only, while this
 * package's jest preset is jsdom.
 */
import { describePlaywrightConfig } from '@descope/e2e-helpers';

// Seed the ports so importing the config is deterministic.
process.env.PLAYWRIGHT_COMPONENTS_PORT ??= '3001';
process.env.PLAYWRIGHT_WIDGET_PORT ??= '3002';

// eslint-disable-next-line import/first
import config from '../playwright.config';

describePlaywrightConfig(config, { maxRetries: 1, minWorkers: 4 });
