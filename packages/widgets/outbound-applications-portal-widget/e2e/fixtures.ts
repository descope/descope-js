import { test as base } from '@playwright/test';
import { widgetName, widgetPort, componentsPort } from './constants';

export const test = base.extend<{
  widgetPort: number;
  widgetName: string;
  componentsPort: number;
}>({
  widgetPort: async ({}, use) => {
    await use(widgetPort);
  },
  widgetName: async ({}, use) => {
    await use(widgetName);
  },
  componentsPort: async ({}, use) => {
    await use(componentsPort);
  },
});

export { expect } from '@playwright/test';
