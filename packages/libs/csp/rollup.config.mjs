import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import fs from 'fs';
import dts from 'rollup-plugin-dts';
import esbuild from 'rollup-plugin-esbuild';

import packageJson from './package.json' with { type: 'json' };

const plugins = [
  typescript({
    tsconfig: './tsconfig.json',
  }),
  commonjs(),
  resolve(),
  esbuild({ minify: true }),
];

const input = './src/index.ts';
const external = (id) =>
  !id.startsWith('\0') && !id.startsWith('.') && !id.startsWith('/');

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
    plugins,
    external,
  },
  {
    input,
    output: {
      file: packageJson.module,
      format: 'esm',
      sourcemap: true,
    },
    plugins,
    external,
  },
  {
    input: './dist/dts/src/index.d.ts',
    output: [{ file: packageJson.types, format: 'esm' }],
    plugins: [
      dts(),
      {
        name: 'cleanup',
        buildEnd: () => {
          fs.rmSync('./dist/dts', { recursive: true, force: true });
          fs.rmSync('./dist/cjs/dts', { recursive: true, force: true });
        },
      },
      {
        name: 'cjsPackage',
        buildEnd: () => {
          fs.writeFileSync(
            './dist/cjs/package.json',
            JSON.stringify({ type: 'commonjs' }),
          );
        },
      },
    ],
  },
];
