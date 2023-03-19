import typescript from '@rollup/plugin-typescript';
import del from 'rollup-plugin-delete';
import { terser } from 'rollup-plugin-terser';
import dts from 'rollup-plugin-dts';
import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import define from 'rollup-plugin-define';

const packageJson = require('./package.json');

const input = 'src/lib/descope-wc/index.ts';

export default [
  {
    input,
    output: {
      dir: 'dist',
      format: 'iife',
    },
    inlineDynamicImports: true,
    plugins: [
      del({ targets: 'dist' }),
      define({
        replacements: {
          BUILD_VERSION: JSON.stringify(packageJson.version),
        },
      }),
      typescript({
        rootDir: './src/lib',
      }),
      commonjs(),
      nodeResolve(),
      terser(),
    ],
  },
  {
    input,
    output: {
      dir: 'dist/esm',
      format: 'esm',
    },
    plugins: [
      typescript({
        rootDir: './src/lib',
        declarationDir: 'dist/esm/dts',
      }),
      define({
        replacements: {
          BUILD_VERSION: JSON.stringify(packageJson.version),
        },
      }),
      commonjs(),
      nodeResolve(),
      terser(),
    ],
  },
  {
    input: './dist/dts/descope-wc/index.d.ts',
    output: [{ file: 'dist/index.d.ts', format: 'esm' }],
    plugins: [
      dts(),
      del({ hook: 'buildEnd', targets: ['./dist/dts', './dist/esm/dts'] }),
    ],
  },
];
