import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import dts from 'rollup-plugin-dts';

const external = [
  '@descope/core-js-sdk',
  '@descope/node-sdk',
  '@modelcontextprotocol/sdk',
  'node:crypto',
  'node:buffer',
  'node:http',
  'node:https',
  'node:util',
  'crypto',
  'buffer',
  'http',
  'https',
  'util',
];

export default [
  // Main ESM build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/esm/index.js',
      format: 'esm',
      sourcemap: true,
    },
    external,
    plugins: [
      nodeResolve({ preferBuiltins: true }),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
      }),
    ],
  },
  // Main CJS build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/cjs/index.js',
      format: 'cjs',
      sourcemap: true,
      exports: 'named',
    },
    external,
    plugins: [
      nodeResolve({ preferBuiltins: true }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
      }),
    ],
  },
  // Server ESM build
  {
    input: 'src/server/index.ts',
    output: {
      file: 'dist/esm/server/index.js',
      format: 'esm',
      sourcemap: true,
    },
    external,
    plugins: [
      nodeResolve({ preferBuiltins: true }),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
      }),
    ],
  },
  // Server CJS build
  {
    input: 'src/server/index.ts',
    output: {
      file: 'dist/cjs/server/index.js',
      format: 'cjs',
      sourcemap: true,
      exports: 'named',
    },
    external,
    plugins: [
      nodeResolve({ preferBuiltins: true }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
      }),
    ],
  },
  // Main Types build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.d.ts',
      format: 'esm',
    },
    external,
    plugins: [dts()],
  },
  // Server Types build
  {
    input: 'src/server/index.ts',
    output: {
      file: 'dist/server/index.d.ts',
      format: 'esm',
    },
    external,
    plugins: [dts()],
  },
];
