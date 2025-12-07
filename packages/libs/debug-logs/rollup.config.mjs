import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';

import packageJson from './package.json' with { type: 'json' };

const plugins = [
  typescript({
    tsconfig: './tsconfig.json',
    declaration: true,
    declarationDir: './dist/types',
  }),
  commonjs(),
  resolve(),
  terser(),
];

const input = './src/index.ts';
const external = ['aws-rum-web'];

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
];
