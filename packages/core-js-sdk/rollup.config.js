import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import terser from '@rollup/plugin-terser';
import copy from 'rollup-plugin-copy'
import typescript from '@rollup/plugin-typescript';
import fs from 'fs';
import del from 'rollup-plugin-delete';
import dts from 'rollup-plugin-dts';

import packageJson from './package.json' assert { type: 'json' };

const plugins = [
  replace({
    values: {
      BUILD_VERSION: JSON.stringify(packageJson.version)
    },
    preventAssignment: true
  }),
  typescript({
    tsconfig: './tsconfig.json'
  }),
  commonjs(),
  resolve(),
  terser()
];
const input = './src/index.ts';
const external = (id) => !id.startsWith('\0') && !id.startsWith('.') && !id.startsWith('/');

export default [
  {
    input,
    output: {
      file: packageJson.main,
      format: 'cjs',
      sourcemap: true,
      exports: 'named'
    },
    plugins,
    external
  },
  {
    input,
    output: {
      file: packageJson.module,
      format: 'esm',
      sourcemap: true
    },
    plugins,
    external
  },
  {
    input: './dist/dts/src/index.d.ts',
    output: [{ file: packageJson.types, format: 'esm' }],
    plugins: [
      dts(),
      del({ hook: 'buildEnd', targets: ['./dist/dts', './dist/cjs/dts'] }),
      cjsPackage()
    ]
  },
  {
    // copy dist folder to root dist folder, so nx build will use it
    // this is a temporary solution until we migrate to nx build
    // input just point to a random file from dist
    input: './dist/index.esm.js',
    plugins: [
      copy({
        targets: [
          {
            src: ['dist/**.*', '!..'], dest: `../../dist/packages/core-js-sdk/`
          },
          {
            src: 'dist/cjs/**.*', dest: `../../dist/packages/core-js-sdk/cjs`,
          }
        ]
      })
    ]
  }
];

function cjsPackage() {
  return {
    name: 'cjsPackage',
    buildEnd: () => {
      fs.writeFileSync('./dist/cjs/package.json', JSON.stringify({ type: 'commonjs' }));
    }
  };
}
