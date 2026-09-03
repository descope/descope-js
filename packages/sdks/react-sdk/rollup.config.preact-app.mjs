/**
 * Builds `examples/preact-app` - the React SDK running inside a Preact app.
 *
 * It is the same pipeline as `rollup.config.app.mjs` plus the `react` ->
 * `preact/compat` alias, which is the only thing a Preact consumer has to do
 * (`@preact/preset-vite` and webpack's `resolve.alias` set up the same map).
 */
import html from '@open-wc/rollup-plugin-html';
import alias from '@rollup/plugin-alias';
import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import typescript from '@rollup/plugin-typescript';
import browsersync from 'rollup-plugin-browsersync';
import del from 'rollup-plugin-delete';
import dotenv from 'rollup-plugin-dotenv';

import packageJson from './package.json' with { type: 'json' };

const envKeys = [
  'DESCOPE_PROJECT_ID',
  'DESCOPE_BASE_URL',
  'DESCOPE_BASE_STATIC_URL',
  'DESCOPE_BASE_CDN_URL',
  'DESCOPE_FLOW_ID',
  'DESCOPE_THEME',
  'DESCOPE_STYLE_ID',
  'DESCOPE_LOCALE',
  'DESCOPE_REDIRECT_URL',
  'DESCOPE_DEBUG_MODE',
  'DESCOPE_TENANT_ID',
  'DESCOPE_REFRESH_COOKIE_NAME',
];

const preactCompat = {
  react: 'preact/compat',
  'react-dom': 'preact/compat',
  'react-dom/client': 'preact/compat/client',
  'react-dom/test-utils': 'preact/compat/test-utils',
  'react/jsx-runtime': 'preact/compat/jsx-runtime',
};

export default {
  preserveSymlinks: true,
  preserveEntrySignatures: false,
  input: 'examples/preact-app/index.html',
  output: { dir: 'build-preact', format: 'esm' },
  plugins: [
    del({ targets: 'build-preact' }),
    alias({
      entries: Object.entries(preactCompat).map(([find, replacement]) => ({
        find: new RegExp(`^${find}$`),
        replacement,
      })),
    }),
    typescript({
      declaration: false,
      declarationDir: null,
      outDir: undefined,
    }),
    commonjs(),
    nodeResolve({ browser: true }),
    dotenv(), // should happen before replace plugin
    replace({
      BUILD_VERSION: JSON.stringify(packageJson.version),
      preventAssignment: true,
      'process.env.NODE_ENV': JSON.stringify('development'),
      ...envKeys.reduce((acc, key) => {
        Object.assign(acc, {
          [`process.env.${key}`]: JSON.stringify(process.env[key] || ''),
        });
        return acc;
      }, {}),
      delimiters: ['', ''],
    }),
    html(),
    // Only serve in watch mode (`npm run start:preact`); a plain build is what
    // CI runs to prove the app compiles against `preact/compat`.
    ...(process.env.ROLLUP_WATCH
      ? [browsersync({ server: 'build-preact', single: true })]
      : []),
  ],
};
