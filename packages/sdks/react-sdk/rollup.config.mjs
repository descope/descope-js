import typescript from '@rollup/plugin-typescript';
import fs from 'fs';
import autoExternal from 'rollup-plugin-auto-external';
import define from 'rollup-plugin-define';
import del from 'rollup-plugin-delete';
import dts from 'rollup-plugin-dts';
import { terser } from 'rollup-plugin-terser';
import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import noEmit from 'rollup-plugin-no-emit';

import packageJson from './package.json' with { type: 'json' };

export default [
  {
    input: ['src/index.ts', 'src/flows.ts'],
    output: [
      {
        dir: './dist/esm',
        sourcemap: true,
        format: 'esm',
        preserveModules: true,
        preserveModulesRoot: 'src',
      },
      {
        dir: './dist/cjs',
        sourcemap: true,
        format: 'cjs',
        preserveModules: true,
        preserveModulesRoot: 'src',
        exports: 'named',
        interop: 'auto',
      },
    ],
    plugins: [
      del({ targets: 'dist/*' }),
      define({
        replacements: {
          BUILD_VERSION: JSON.stringify(packageJson.version),
        },
      }),
      typescript({
        compilerOptions: {
          rootDir: './src',
        },
      }),
      autoExternal(),
      terser(),
    ],
  },
  {
    input: 'src/index.ts',
    external: ['react'],
    inlineDynamicImports: true,
    output: {
      file: 'dist/index.umd.js',
      format: 'umd',
      sourcemap: true,
      name: 'Descope',
      inlineDynamicImports: true,
      globals: {
        react: 'React',
      },
    },
    plugins: [
      define({
        replacements: {
          BUILD_VERSION: JSON.stringify(packageJson.version),
        },
      }),
      typescript({
        compilerOptions: {
          rootDir: './src',
        },
      }),
      commonjs(),
      nodeResolve(),
      terser(),
    ],
  },
  {
    input: 'src/index.ts',
    output: [{ dir: './dist', format: 'esm' }],
    plugins: [
      typescript({
        tsconfig: './tsconfig.json',
        compilerOptions: {
          rootDir: './src',
          declaration: true,
          declarationDir: './dist/types',
        },
      }),
      dts(),
      cjsPackage(),
      noEmit({ match: (file) => file.endsWith('.js') }),
    ],
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
