import html from '@open-wc/rollup-plugin-html';
import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import typescript from '@rollup/plugin-typescript';
import dotenv from 'dotenv';
import define from 'rollup-plugin-define';
import del from 'rollup-plugin-delete';
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
        DESCOPE_BASE_STATIC_URL: JSON.stringify(
          process.env.DESCOPE_BASE_STATIC_URL || '',
        ),
        DESCOPE_WIDGET_ID: JSON.stringify(process.env.DESCOPE_WIDGET_ID || ''),
        DESCOPE_TENANT_ID: JSON.stringify(process.env.DESCOPE_TENANT_ID || ''),
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
