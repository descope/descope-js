import html from '@open-wc/rollup-plugin-html';
import typescript from '@rollup/plugin-typescript';
import del from 'rollup-plugin-delete';
import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';
import dotenv from 'dotenv';
import define from 'rollup-plugin-define';
import svg from 'rollup-plugin-svg-import';

import packageJson from './package.json' assert { type: 'json' };

dotenv.config();

export default {
  preserveSymlinks: true,
  input: 'src/app/index.html',
  output: { dir: 'build', format: 'esm', sourcemap: true },
  plugins: [
    define({
      replacements: {
        BUILD_VERSION: JSON.stringify(packageJson.version),
        DESCOPE_PROJECT_ID: JSON.stringify(
          process.env.DESCOPE_PROJECT_ID || '',
        ),
        DESCOPE_BASE_URL: JSON.stringify(process.env.DESCOPE_BASE_URL || ''),
        DESCOPE_WIDGET_ID: JSON.stringify(process.env.DESCOPE_WIDGET_ID || ''),
      },
    }),
    del({ targets: 'build' }),
    typescript({
      declaration: false,
      declarationDir: 'build',
    }),
    commonjs(),
    nodeResolve(),
    replace({
      preventAssignment: true,
      'process.env.NODE_ENV': JSON.stringify('development'),
    }),
    svg(),
    html({
      minify: false,
    }),
  ],
};
