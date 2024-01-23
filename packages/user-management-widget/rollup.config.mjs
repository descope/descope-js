import typescript from '@rollup/plugin-typescript';
import del from 'rollup-plugin-delete';
import { terser } from 'rollup-plugin-terser';
import dts from 'rollup-plugin-dts';
import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import define from 'rollup-plugin-define';
import svg from 'rollup-plugin-svg-import';

import packageJson from './package.json' assert { type: 'json' };
import { SourceMap } from 'module';

const input = './src/lib/index.ts';
const external = (id) =>
  !id.startsWith('\0') && !id.startsWith('.') && !id.startsWith('/');

const { PRODUCTION } = process.env

export default [
  {
    input,
    output: {
      dir: 'dist',
      format: 'iife',
      sourcemap: true,
    },
    inlineDynamicImports: true,
    plugins: [
      del({ targets: 'dist' }),
      define({
        replacements: {
          BUILD_VERSION: JSON.stringify(packageJson.version),
          'process.env.NODE_ENV': JSON.stringify(
            PRODUCTION ? 'production' : 'development'
          )
        },
      }),
      typescript({
        rootDir: './src/lib',
      }),
      commonjs(),
      nodeResolve(),
      terser(),
      svg()
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
      svg()

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
