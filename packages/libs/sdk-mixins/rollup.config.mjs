import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import fs from 'fs';
import del from 'rollup-plugin-delete';
import dts from 'rollup-plugin-dts';
import terser from '@rollup/plugin-terser';
import replace from '@rollup/plugin-replace';
import noEmit from 'rollup-plugin-no-emit';

import packageJson from './package.json' assert { type: 'json' };

const input = [
  './src/index.ts',
  './src/mixins/themeMixin/index.ts',
  './src/mixins/staticResourcesMixin/index.ts',
];
const external = (id) =>
  !id.startsWith('\0') && !id.startsWith('.') && !id.startsWith('/');

export default [
  {
    input,
    output: [
      {
        dir: './dist/cjs',
        format: 'cjs',
        sourcemap: true,
        exports: 'named',
        interop: 'compat',
        inlineDynamicImports: false,
        preserveModules: true,
      },
      {
        dir: './dist/esm',
        format: 'esm',
        sourcemap: true,
        inlineDynamicImports: false,
        preserveModules: true,
      },
    ],
    plugins: [
      del({ targets: 'dist/*' }),
      replace({
        values: {
          BUILD_VERSION: JSON.stringify(packageJson.version),
        },
        preventAssignment: true,
      }),
      typescript({
        tsconfig: './tsconfig.json',
      }),
      commonjs(),
      resolve(),
      // terser(),
    ],
    external,
  },
  {
    input: input[0],
    output: [{ dir: './dist', format: 'esm', inlineDynamicImports: true }],
    plugins: [
      typescript({
        tsconfig: './tsconfig.json',
        compilerOptions: {
          declaration: true,
          declarationDir: './dist/types',
        },
      }),
      dts(),
      cjsPackage(),
      noEmit({ match: (file) => file.endsWith('.js') }),
    ],
    external,
  },
];

function cjsPackage() {
  return {
    name: 'cjsPackage',
    buildEnd: () => {
      fs.writeFileSync(
        './dist/cjs/package.json',
        JSON.stringify({ type: 'commonjs' }),
      );
    },
  };
}
