# Descope JS

![github-header-image (2) (1)](https://github.com/descope/.github/assets/32936811/d904d37e-e3fa-4331-9f10-2880bb708f64)

Welcome to the Descope JavaScript respostiry.
The Descope JS respostiry is composed of npm packages, sdks and widgets.

## 🖥️ Client SDKs

Descope Client SDKs are used to create and manage authentication flows, management widgets, and session management. They are especially useful when integrating Descope into your client application.

- **[React](https://github.com/descope/descope-js/tree/main/packages/sdks/react-sdk)**
- **[NextJS](https://github.com/descope/descope-js/tree/main/packages/sdks/nextjs-sdk)**
- **[Angular](https://github.com/descope/descope-js/tree/main/packages/sdks/angular-sdk)**
- **[Vue](https://github.com/descope/descope-js/tree/main/packages/sdks/vue-sdk)**
- **[Web Component (HTML)](https://github.com/descope/descope-js/tree/main/packages/sdks/web-component)**

## :cherry_blossom: Widgets

[Descope Widgets](https://github.com/descope/descope-js/tree/main/packages/widgets) are embeddable components designed to facilitate the delegation of operations to your application's users. These widgets can be utilized in both B2B and B2C contexts, allowing your users to perform various tenant, user management, and project level operations from within the application itself.  
[Read More](https://docs.descope.com/customize/widgets) about Descope's widgets.

## :open_file_folder: Folder structure

This repository hosts multiple packages, sdks, widgets, located under the `./packages` directory, organized as follows:

    .
    ├── ...
    ├── packages
    │   ├── libs         # sdks helpers and drivers
    │   ├── sdks         # Descope Client SDKs
    │   └── widgets      # Descope embeddable widgets
    └── ...

For more detailed information, please consult the README and the specific instructions provided for each package.

## Contribution

This monorepo is built and managed using [NX](https://nx.dev/). In order to use the repo locally.

1. Fork / Clone this repository
2. Run `pnpm i`
3. Use the available scripts in the root level `package.json`. e.g. `pnpm run <test/lint/build>`

You can find README and examples in each package.

#### Notes

- **Pull Request** title (which is used as the squash & merge commit messages) must met [conventional commits](https://www.conventionalcommits.org) (e.g. "fix: ..." / "chore: ...", "feat: ...")
- **Release new versions** is done by merging a commit message containing the word `RELEASE` (e.g. `chore: ... RELEASE`)

## Contact Us

If you need help you can email [Descope Support](mailto:support@descope.com)

## License

The Descope JS is licensed for use under the terms and conditions of the [MIT license Agreement](./LICENSE).
