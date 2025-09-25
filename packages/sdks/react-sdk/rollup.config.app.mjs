import html from '@open-wc/rollup-plugin-html';
import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import typescript from '@rollup/plugin-typescript';
import browsersync from 'rollup-plugin-browsersync';
import del from 'rollup-plugin-delete';
import dotenv from 'rollup-plugin-dotenv';
import autoExternal from 'rollup-plugin-auto-external';

import packageJson from './package.json' assert { type: 'json' };

export default {
  preserveSymlinks: true,
  preserveEntrySignatures: false,
  input: 'examples/app/index.html',
  output: { dir: 'build', format: 'esm' },
  // external: ['react-router', 'scheduler'],
  plugins: [
    del({ targets: 'build' }),
    typescript({
      declaration: false,
      declarationDir: null,
    }),
    commonjs(),
    nodeResolve(),
    dotenv(), // should happen before replace plugin
    replace({
      BUILD_VERSION: JSON.stringify(packageJson.version),
      preventAssignment: true,
      'process.env.NODE_ENV': JSON.stringify('development'),
      'process.env': JSON.stringify(process.env),
      delimiters: ['', ''],
    }),
    html(),
    browsersync({
      server: 'build',
      single: true, // requires for routing
    }),
  ],
};
