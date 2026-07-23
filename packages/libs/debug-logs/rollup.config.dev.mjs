import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import serve from 'rollup-plugin-serve';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

import packageJson from './package.json' with { type: 'json' };

dotenv.config();

const input = './src/index.ts';

const DEMO_ENV_KEYS = [
  'DESCOPE_TELEMETRY_APPLICATION_ID',
  'DESCOPE_TELEMETRY_IDENTITY_POOL_ID',
  'DESCOPE_TELEMETRY_REGION',
  'DESCOPE_TELEMETRY_GUEST_ROLE_ARN',
  'DESCOPE_TELEMETRY_SESSION_SAMPLE_RATE',
];

/**
 * Emits dist/demo-env.js with the AWS CloudWatch RUM credentials read from
 * .env at build time. test-standalone.html loads this file as a regular
 * script so the form can be pre-populated without baking secrets into
 * committed HTML.
 */
function emitDemoEnv() {
  return {
    name: 'emit-demo-env',
    writeBundle() {
      const env = DEMO_ENV_KEYS.reduce((acc, key) => {
        acc[key] = process.env[key] || '';
        return acc;
      }, {});
      const outFile = path.resolve('./dist/demo-env.js');
      fs.mkdirSync(path.dirname(outFile), { recursive: true });
      fs.writeFileSync(
        outFile,
        `// Generated at build time from packages/libs/debug-logs/.env\n` +
          `// Do not commit. Do not edit by hand.\n` +
          `window.__demoEnv = ${JSON.stringify(env, null, 2)};\n`,
      );
    },
  };
}

// Bundle all dependencies for browser testing (don't mark as external)
const devPlugins = [
  typescript({
    tsconfig: './tsconfig.json',
    declaration: false, // Skip type declarations in dev for faster builds
  }),
  resolve({
    browser: true, // Use browser-compatible versions of modules
  }),
  commonjs(),
  emitDemoEnv(),
  serve({
    open: true,
    openPage: '/test-standalone.html',
    contentBase: ['./'],
    port: 5555,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  }),
];

// Only build ESM version in dev mode for faster rebuilds
export default {
  input,
  output: {
    file: packageJson.module,
    format: 'esm',
    sourcemap: true,
  },
  plugins: devPlugins,
  // No external dependencies - bundle everything for browser
};
