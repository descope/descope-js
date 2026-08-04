import html from '@open-wc/rollup-plugin-html';
import typescript from '@rollup/plugin-typescript';
import del from 'rollup-plugin-delete';
import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';
import dotenv from 'dotenv';
import define from 'rollup-plugin-define';

import packageJson from './package.json' with { type: 'json' };

dotenv.config();

export default {
  preserveSymlinks: true,
  input: process.env.HTML_FILE || 'src/app/index.html',
  output: { dir: 'build', format: 'esm', sourcemap: true },
  plugins: [
    define({
      replacements: {
        BUILD_VERSION: JSON.stringify(packageJson.version),
        'process.env.DESCOPE_PROJECT_ID': JSON.stringify(
          process.env.DESCOPE_PROJECT_ID || '',
        ),
        'process.env.DESCOPE_BASE_URL': JSON.stringify(
          process.env.DESCOPE_BASE_URL || '',
        ),
        'process.env.DESCOPE_FLOW_ID': JSON.stringify(
          process.env.DESCOPE_FLOW_ID || '',
        ),
        'process.env.DESCOPE_BASE_STATIC_URL': JSON.stringify(
          process.env.DESCOPE_BASE_STATIC_URL || '',
        ),
        'process.env.DESCOPE_BASE_CDN_URL': JSON.stringify(
          process.env.DESCOPE_BASE_CDN_URL || '',
        ),
        // Telemetry fallback config (read by telemetryMixin#getTelemetryConfig
        // when the backend doesn't ship a telemetry block). Keep these out
        // of source code — they live in packages/sdks/web-component/.env.
        'process.env.DESCOPE_TELEMETRY_ENABLED': JSON.stringify(
          process.env.DESCOPE_TELEMETRY_ENABLED || '',
        ),
        'process.env.DESCOPE_TELEMETRY_APPLICATION_ID': JSON.stringify(
          process.env.DESCOPE_TELEMETRY_APPLICATION_ID || '',
        ),
        'process.env.DESCOPE_TELEMETRY_IDENTITY_POOL_ID': JSON.stringify(
          process.env.DESCOPE_TELEMETRY_IDENTITY_POOL_ID || '',
        ),
        'process.env.DESCOPE_TELEMETRY_GUEST_ROLE_ARN': JSON.stringify(
          process.env.DESCOPE_TELEMETRY_GUEST_ROLE_ARN || '',
        ),
        'process.env.DESCOPE_TELEMETRY_REGION': JSON.stringify(
          process.env.DESCOPE_TELEMETRY_REGION || '',
        ),
        'process.env.DESCOPE_TELEMETRY_SESSION_SAMPLE_RATE': JSON.stringify(
          process.env.DESCOPE_TELEMETRY_SESSION_SAMPLE_RATE || '',
        ),
      },
    }),
    del({ targets: 'build' }),
    typescript({
      declaration: false,
      declarationDir: 'build',
    }),
    commonjs(),
    nodeResolve(),
    replace({
      preventAssignment: true,
      'process.env.NODE_ENV': JSON.stringify('development'),
    }),
    html({
      minify: false,
      transform: (contents) =>
        contents
          .replace('<project-id>', process.env.DESCOPE_PROJECT_ID || '')
          .replace('<flow-id>', process.env.DESCOPE_FLOW_ID || 'sign-up-or-in')
          .replace('<base-url>', process.env.DESCOPE_BASE_URL || '')
          .replace(
            '<base-static-url>',
            process.env.DESCOPE_BASE_STATIC_URL || '',
          )
          .replace('<base-cdn-url>', process.env.DESCOPE_BASE_CDN_URL || '')
          .replace('<locale>', process.env.DESCOPE_LOCALE || ''),
    }),
  ],
};
