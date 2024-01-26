import html from '@open-wc/rollup-plugin-html';
import conf from './rollup.config.app.mjs';
import { plugins } from './rollup.config.app.mjs';

export default {
  ...conf,
  plugins: [
    ...plugins,
    html({
      minify: false,
      transform: (contents) =>
        contents
          .replaceAll('<base-url>', '')
          .replaceAll('<project-id>', 'mockProjectId')
          .replaceAll('<tenant>', 'mockTenant'),
    }),
  ],
};
