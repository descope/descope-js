import html from '@open-wc/rollup-plugin-html';
import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import typescript from '@rollup/plugin-typescript';
import browsersync from 'rollup-plugin-browsersync';
import del from 'rollup-plugin-delete';
import dotenv from 'rollup-plugin-dotenv';
import autoExternal from 'rollup-plugin-auto-external';

import packageJson from './package.json' with { type: 'json' };

const envKeys = [
  'DESCOPE_PROJECT_ID',
  'DESCOPE_BASE_URL',
  'DESCOPE_BASE_STATIC_URL',
  'DESCOPE_BASE_CDN_URL',
  'DESCOPE_FLOW_ID',
  'DESCOPE_STEP_UP_FLOW_ID',
  'DESCOPE_THEME',
  'DESCOPE_STYLE_ID',
  'DESCOPE_LOCALE',
  'DESCOPE_REDIRECT_URL',
  'DESCOPE_DEBUG_MODE',
  'DESCOPE_TELEMETRY_KEY',
  'DESCOPE_TENANT_ID',
  'DESCOPE_REFRESH_COOKIE_NAME',
  'DESCOPE_OIDC_ENABLED',
  'DESCOPE_OIDC_APPLICATION_ID',
];

export default {
  preserveSymlinks: true,
  preserveEntrySignatures: false,
  input: 'examples/app/index.html',
  output: { dir: 'build', format: 'esm' },
  // external: ['react-router', 'scheduler'],
  plugins: [
    del({ targets: 'build' }),
    typescript({
      declaration: false,
      declarationDir: null,
    }),
    commonjs(),
    nodeResolve(),
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
    browsersync({
      server: 'build',
      single: true, // requires for routing
    }),
  ],
};
