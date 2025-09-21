import typescript from '@rollup/plugin-typescript';
import del from 'rollup-plugin-delete';
import { terser } from 'rollup-plugin-terser';
import dts from 'rollup-plugin-dts';
import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import define from 'rollup-plugin-define';
import replace from '@rollup/plugin-replace';

import packageJson from './package.json' assert { type: 'json' };

const input = './src/lib/descope-wc/index.ts';
const external = (id) =>
  !id.startsWith('\0') && !id.startsWith('.') && !id.startsWith('/');

export default [
  {
    input,
    output: {
      dir: 'dist',
      format: 'iife',
      inlineDynamicImports: true,
    },
    plugins: [
      del({ targets: 'dist/*' }),
      define({
        replacements: {
          BUILD_VERSION: JSON.stringify(packageJson.version),
        },
      }),
      typescript({
        rootDir: './src/lib',
        declaration: true,
        declarationDir: 'dist/dts',
      }),
      commonjs(),
      nodeResolve(),
      replace({
        preventAssignment: true,
        'process.env.NODE_ENV': JSON.stringify('production'),
      }),
      terser(),
    ],
  },
  {
    input,
    output: [
      {
        dir: 'dist/esm',
        format: 'esm',
        preserveModules: true,
        sourcemap: true,
      },
      {
        dir: 'dist/cjs',
        format: 'cjs',
        preserveModules: true,
        sourcemap: true,
      },
    ],
    plugins: [
      typescript({}),
      define({
        replacements: {
          BUILD_VERSION: JSON.stringify(packageJson.version),
        },
      }),
      commonjs(),
      nodeResolve(),
      replace({
        preventAssignment: true,
        'process.env.NODE_ENV': JSON.stringify('production'),
      }),
      terser(),
    ],
    external,
  },
  {
    input: './dist/dts/descope-wc/index.d.ts',
    output: [{ file: 'dist/index.d.ts', format: 'esm' }],
    plugins: [
      dts(),
      del({ hook: 'buildEnd', targets: ['./dist/dts', './dist/esm/dts'] }),
    ],
    external,
  },
];
