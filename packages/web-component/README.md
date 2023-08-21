# @descope/web-component

Create your login pages on our console-app, once done, you can use this library to inject those pages to your app</br>
it registers- a [web component](https://developer.mozilla.org/en-US/docs/Web/Web_Components) and update the web-component content based on the relevant page,
See usage example below

## Usage

### Install the package

```bash
npm install @descope/web-component
```

### As a library

```js
import '@descope/web-component' // This import will define `descope-wc` custom element
import { DescopeWc } // In case you need types definition or you want to use the class directly

// Render Descope Web Component, for example:
render(){
  return (
    <descope-wc project="myProjectId"/>
  )
}
```

### In HTML file

- Copy the file `@descope/web-js/sdk/dist/descope-wc.js` and place it where your HTML file is located

- Add the following script tag to your HTML file

```html
<head>
  <script src="./my-lib.umd.production.min.js"></script>
</head>
```

- Now you can add the custom element to your HTML

```html
<descope-wc project-id="<project-id>" flow-id="<flow-id>"></descope-wc>
```

### Run Example

To run the example:

1. Clone the repo
1. Install dependencies `pnpm i`
1. Go to package directory `cd packages/web-component`
1. Create a `.env` file and the following variables:

```env
// .env
# Descope Project ID
DESCOPE_PROJECT_ID=<project-id>
# Flow ID to run, e.g. sign-up-or-in
DESCOPE_FLOW_ID=<flow-id>
# Optional - Descope base URL
DESCOPE_BASE_URL
# Optional - Descope locale (according to the target locales configured in the flow)
DESCOPE_LOCALE=<locale>
```

1. Run the sample `pnpm run start`

NOTE: This package is a part of a monorepo. so if you make changes in a dependency, you will have to rerun `npm run start` (this is a temporary solution until we improve the process to fit to monorepo).

## Optional Attributes

| Attribute    | Available options                                                                                                                                                                                                                         | Default value |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| base-url     | Custom Descope base URL                                                                                                                                                                                                                   | **""**        |
| theme        | **"light"** - Light theme</br>**"dark"** - Dark theme</br>**"os"** - Auto select a theme based on the OS theme settings                                                                                                                   | **"light"**   |
| debug        | **"true"** - Enable debugger</br>**"false"** - Disable debugger                                                                                                                                                                           | **"false"**   |
| telemetryKey | **String** - Telemetry public key provided by Descope Inc                                                                                                                                                                                 | **""**        |
| auto-focus   | **"true"** - Automatically focus on the first input of each screen</br>**"false"** - Do not automatically focus on screen's inputs</br>**"skipFirstScreen"** - Automatically focus on the first input of each screen, except first screen | **"true"**    |
|              |                                                                                                                                                                                                                                           |               |

## Optional Properties

### `errorTransformer` - A function that receives an error object and returns a string. The returned string will be displayed to the user.

The function can be used to translate error messages to the user's language or to change the error message.

Usage example:

```javascript
function translateError(error) {
  const translationMap = {
    SAMLStartFailed: 'No es posible iniciar sesión en este momento, por favor intenta nuevamente más tarde',
  };
  return translationMap[error.type] || error.text;
}

const descopeWcEle = document.getElementsByTagName('descope-wc')[0];

descopeWcEle.errorTransformer = translateError;
```

### `logger` - An object that defines how to log error, warning and info. Defaults to console.error, console.warn and console.info respectively

Usage example:

```javascript
const logger = {
  info: (message: string, description: string, state: any) => {
    console.log(message, description);
  },
  warn: (title: string, description: string) => {
    console.warn(`WARN: ${title}`, description);
  },
  error: (title: string, description: string) => {
    console.error(`ERROR: ${title}`, description);
  },
};

const descopeWcEle = document.getElementsByTagName('descope-wc')[0];

descopeWcEle.logger = logger;
```

## Events

### `error` - Fired when an error occurs. The event detail contains the error object.

Usage example:

```javascript
const descopeWcEle = document.getElementsByTagName('descope-wc')[0];
descopeWcEle.addEventListener('error', (e) => alert(`Error! - ${e.detail.errorMessage}`));
```

### `success` - Fired when the flow is completed successfully. The event detail contains the flow result.

Usage example:

```javascript
const descopeWcEle = document.getElementsByTagName('descope-wc')[0];
descopeWcEle.addEventListener('success', (e) => alert(`Success! - ${JSON.stringify(e.detail)}`));
```
