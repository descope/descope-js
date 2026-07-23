import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import autoExternal from 'rollup-plugin-auto-external';

import packageJson from './package.json' with { type: 'json' };

const plugins = [
  typescript({
    tsconfig: './tsconfig.json',
    declaration: true,
    declarationDir: './dist/types',
  }),
  commonjs(),
  resolve({
    browser: true, // Use browser-specific versions of packages
    preferBuiltins: false, // Don't prefer Node.js built-ins
  }),
  terser(),
];

const input = './src/index.ts';

export default [
  {
    input,
    output: {
      file: packageJson.main,
      format: 'cjs',
      sourcemap: true,
      exports: 'named',
      interop: 'compat',
    },
    plugins: [autoExternal(), ...plugins], // Auto-externalize dependencies
  },
  {
    input,
    output: {
      file: packageJson.module,
      format: 'esm',
      sourcemap: true,
    },
    plugins: [autoExternal(), ...plugins], // Auto-externalize dependencies
  },
  {
    input,
    output: {
      file: 'dist/index.js',
      format: 'umd',
      name: 'DescopeDebugLogs',
      sourcemap: true,
      exports: 'default', // Since we now have a default export
    },
    plugins, // Bundle everything for UMD (browser) - no autoExternal
    external: [], // Explicitly bundle everything
    context: 'window', // Set 'this' to 'window' in UMD for browser compatibility
  },
];
