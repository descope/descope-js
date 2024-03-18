import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import banner from 'rollup-plugin-banner2';
import define from 'rollup-plugin-define';
import del from 'rollup-plugin-delete';
import dts from 'rollup-plugin-dts';
import svg from 'rollup-plugin-svg-import';
import { terser } from 'rollup-plugin-terser';

import packageJson from './package.json' assert { type: 'json' };

const input = './src/lib/index.ts';
const external = (id) =>
  !id.startsWith('\0') && !id.startsWith('.') && !id.startsWith('/');

const { PRODUCTION } = process.env;

export default [
  {
    input,
    output: {
      dir: 'dist',
      format: 'iife',
      sourcemap: true,
      name: 'descope-access-key-management-widget',
      extend: true,
    },
    inlineDynamicImports: true,
    plugins: [
      del({ targets: 'dist' }),
      define({
        replacements: {
          BUILD_VERSION: JSON.stringify(packageJson.version),
          'process.env.NODE_ENV': JSON.stringify(
            PRODUCTION ? 'production' : 'development',
          ),
        },
      }),
      typescript({
        rootDir: './src/lib',
      }),
      commonjs(),
      nodeResolve(),
      terser(),
      svg(),
      banner(
        () => `
      /**
       * ${packageJson.name} v${packageJson.version}
       */
      `,
      ),
    ],
  },
  {
    input,
    output: {
      dir: 'dist/esm',
      format: 'esm',
      sourcemap: true,
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
      svg(),
      banner(
        () => `
      /**
       * ${packageJson.name} v${packageJson.version}
       */
      `,
      ),
    ],

    external,
  },
  {
    input: './dist/dts/index.d.ts',
    output: [{ file: 'dist/index.d.ts', format: 'esm' }],
    plugins: [
      dts(),
      del({ hook: 'buildEnd', targets: ['./dist/dts', './dist/esm/dts'] }),
    ],
  },
];
