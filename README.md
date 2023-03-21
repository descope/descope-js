# Descope JS

The Descope JS repo is composed of many npm packages that are used in Descope SDKs
You can read more on the [Descope Website](https://descope.com).

## Packages

Descope provides few packages listed bellow.
Please refer to the README and instructions of those SDKs for more detailed information.

- [core-js-sdk](/packages/core-js-sdk): Core SDK. Function that abstract http API usage.
- [web-js-sdk](/packages/web-js-sdk): Web SDK. an SDK for browser usage.
- [web-component](/packages/web-component): Web component. Exposes HTML [web components](https://developer.mozilla.org/en-US/docs/Web/Web_Components) such as Descope flow.

## Contribution

This monorepo is built and managed using [NX](https://nx.dev/). In order to use the repo locally.

1. Clone this repo
2. Run `pnpm i`
3. Use the available scripts in the root level `package.json`. e.g. `pnpm run <test/lint/build>`

Few repos exposes examples. Refer to packages README to run them

Notes

- The squash & merge commit messages must met [conventional commits](https://www.conventionalcommits.org) (e.g. "fix: ..." / "chore: ...", "feat: ...")
- Release new versions is done by merging a commit message containing the word `RELEASE` (e.g. `chore: ... RELEASE`)

## Contact Us

If you need help you can email [Descope Support](mailto:support@descope.com)
