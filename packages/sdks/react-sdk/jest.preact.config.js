/**
 * Runs the exact same test suite as `jest.config.js`, but with `react` and
 * `react-dom` aliased to `preact/compat` - the same aliasing a Preact app does
 * in its bundler (`@preact/preset-vite`, webpack `resolve.alias`, etc.).
 *
 * The point is that this config shares the test files with the React run:
 * any behaviour the React suite asserts is asserted against Preact too, so a
 * compat regression fails CI instead of reaching a consumer.
 */
import base from './jest.config.js';

export default {
  ...base,

  displayName: 'preact',

  // `test/` is the shared suite, `test-preact/` holds the compat-only checks.
  roots: ['src', 'test', 'test-preact'],

  // The React run already reports coverage; this run is about behaviour parity.
  collectCoverage: false,
  coverageDirectory: undefined,

  // jest-environment-jsdom defaults `customExportConditions` to `['browser']`,
  // and preact's `browser` condition points at its ESM build - which the CJS
  // test runtime can't parse. Emptying it falls back to `require`.
  testEnvironmentOptions: {
    ...base.testEnvironmentOptions,
    customExportConditions: [],
  },

  // Order matters - the first matching pattern wins, so the more specific
  // subpath entries have to come before the bare `react`/`react-dom` ones.
  moduleNameMapper: {
    '^react/jsx-runtime$': 'preact/compat/jsx-runtime',
    '^react/jsx-dev-runtime$': 'preact/compat/jsx-dev-runtime',
    '^react-dom/client$': 'preact/compat/client',
    '^react-dom/server$': 'preact/compat/server',
    '^react-dom/test-utils$': 'preact/compat/test-utils',
    '^react-dom$': 'preact/compat',
    '^react$': 'preact/compat',
  },
};
