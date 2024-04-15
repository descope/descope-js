import html from '@open-wc/rollup-plugin-html';
import typescript from '@rollup/plugin-typescript';
import del from 'rollup-plugin-delete';
import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';
import dotenv from 'dotenv';
import define from 'rollup-plugin-define';

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
    html({
      minify: false,
      transform: (contents) =>
        contents
          .replace('<project-id>', process.env.DESCOPE_PROJECT_ID || '')
          .replace('<flow-id>', process.env.DESCOPE_FLOW_ID || 'sign-up-or-in')
          .replace('<base-url>', process.env.DESCOPE_BASE_URL || '')
          .replace('<locale>', process.env.DESCOPE_LOCALE || ''),
    }),
  ],
};
