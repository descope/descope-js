- fix esm build of web-component (not related to monorepo)
  we should not bundle dependencies on the esm build

- make start to consider workspace packages changes (i.e. when changing core - it should re-transpile) , if not - need to document that in readme or something similar

- pre-commit hooks (lint & prettier)
- prettier?
- optional - send to slack channel on release

- reuse config files (such as tsconfig, jest, lint, rollup, etc..)
- research using project json (with plugins) vs package.json scripts
