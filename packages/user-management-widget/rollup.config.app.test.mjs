import conf from './rollup.config.app.mjs';

// If TS type errors remove bs-recipes references in package-lock.json due to bad global React typings
export default {
  ...conf,
  plugins: [...conf.plugins],
};
