# Descope JS

The Descope JS repo is composed of many npm packages that are used in Descope SDKs
You can read more on the [Descope Website](https://descope.com).

## Folder structure

This repository hosts multiple packages, located in the `./packages` directory, organized as follows:

- ./widgets
- ./sdks
- ./libs

For more detailed information, please consult the README and the specific instructions provided for each package.

## Contribution

This monorepo is built and managed using [NX](https://nx.dev/). In order to use the repo locally.

1. Clone this repo
2. Run `pnpm i`
3. Use the available scripts in the root level `package.json`. e.g. `pnpm run <test/lint/build>`

Few repos exposes examples. Refer to packages README to run them

#### Notes

- **Pull Request** title (which is used as the squash & merge commit messages) must met [conventional commits](https://www.conventionalcommits.org) (e.g. "fix: ..." / "chore: ...", "feat: ...")
- **Release new versions** is done by merging a commit message containing the word `RELEASE` (e.g. `chore: ... RELEASE`)

## Contact Us

If you need help you can email [Descope Support](mailto:support@descope.com)
