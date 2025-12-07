import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import serve from 'rollup-plugin-serve';

import packageJson from './package.json' with { type: 'json' };

const input = './src/index.ts';

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
