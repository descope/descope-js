import * as pw from '@playwright/test';

const cspErrorPatterns = [/^Refused to/];
const cspIgnoreBrowsers = ['webkit'];

const isMessageMatchPatterns = (message, patterns) => {
  return patterns.some((pattern) => pattern.test(message));
};

const getIsCspError = (message, browserName) =>
  !cspIgnoreBrowsers.includes(browserName) &&
  message.type() === 'error' &&
  isMessageMatchPatterns(message.text(), cspErrorPatterns);

// we are overriding the default test runner to add a check for console errors
// if any console errors are detected, the test will fail
const test = pw.test.extend({
  page: async ({ page, browserName }, use) => {
    let isCspError = false;

    page.on('console', (message) => {
      if (getIsCspError(message, browserName)) {
        isCspError = true;
      }
    });
    await use(page);

    if (isCspError)
      throw new Error(`CSP errors detected.  See console output for details.`);
  },
});

export { test };
