import { test as base } from '@playwright/test';
import { generatePortFromWidgetName } from './port-generator';

export interface WidgetTestFixtures {
  widgetPort: number;
  widgetName: string;
  componentsPort: number;
  baseURL: string;
}

/**
 * Creates Playwright test fixtures for a widget with generated ports.
 *
 * @param widgetName The name of the widget (e.g., 'user-management-widget')
 * @returns Extended test function with widget-specific fixtures
 */
export function createWidgetFixtures(widgetName: string) {
  const widgetPort = generatePortFromWidgetName(widgetName);
  const componentsPort = generatePortFromWidgetName(`${widgetName}-components`);
  const baseURL = `http://localhost:${widgetPort}`;

  return base.extend<WidgetTestFixtures>({
    widgetPort: async ({}, use: (arg: number) => Promise<void>) =>
      await use(widgetPort),
    widgetName: async ({}, use: (arg: string) => Promise<void>) =>
      await use(widgetName),
    componentsPort: async ({}, use: (arg: number) => Promise<void>) =>
      await use(componentsPort),
    baseURL: async ({}, use: (arg: string) => Promise<void>) =>
      await use(baseURL),
  });
}
