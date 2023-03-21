- fix esm build of web-component (not related to monorepo)
  we should not bundle dependencies on the esm build

- make start to consider workspace packages changes (i.e. when changing core - it should re-transpile) , if not - need to document that in readme or something similar

- optional - send to slack channel on release

- reuse config files (such as tsconfig, jest, lint, rollup, etc..)
- research using project json (with plugins) vs package.json scripts
- packages cleanup ("eslint-plugin-react": "^7.28.0" in core-js-sdk)
- renovate
- check that CI is failing when command is failing
- change all base branches from `nx` to `main`
