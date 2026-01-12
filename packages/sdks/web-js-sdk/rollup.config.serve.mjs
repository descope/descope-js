import browsersync from 'rollup-plugin-browsersync';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import replace from '@rollup/plugin-replace';
import fs from 'fs';
import path from 'path';

import packageJson from './package.json' with { type: 'json' };

const plugins = [
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
];

// Build the UMD bundle and serve examples with live reload
export default {
  input: './src/index.umd.ts',
  output: {
    file: 'dist/index.umd.js',
    format: 'umd',
    sourcemap: true,
    name: 'Descope',
    inlineDynamicImports: true,
  },
  plugins: [
    ...plugins,
    browsersync({
      server: {
        baseDir: '.',
        directory: true,
        serveStaticOptions: {
          dotfiles: 'allow',
        },
      },
      files: ['dist/**/*.js', 'examples/**/*.html', 'examples/**/*.js'],
      port: 8081,
      https: {
        key: './key.pem',
        cert: './cert.pem',
      },
      startPath: '/examples',
      notify: false,
    }),
  ],
};
