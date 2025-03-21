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
    <descope-wc project-id="myProjectId"/>
  )
}
```

### In HTML file

- Copy the file `@descope/web-component/dist/index.js` rename it to `descope-wc.js` and place it where your HTML file is located

- Add the following script tag to your HTML file

```html
<head>
  <script src="./descope-wc.js"></script>
</head>
```

- Now you can add the custom element to your HTML

```html
<descope-wc project-id="<project-id>" flow-id="<flow-id>" form='{ "email": "predefinedname@domain.com", "myCustomInput": "12" }' client='{ "browserVersion": window.navigator.appVersion }'></descope-wc>
```

- Note: the `form` and `client` are optional parameters to add additional information that can be used in the flow. For more information [click here](https://docs.descope.com/knowledgebase/descopeflows/flowinputs/#HTML).

### Run Example

To run the example:

1. Install dependencies `pnpm i`
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

1. Run the sample `pnpm run start` / `pnpm run start-web-sample`

NOTE: This package is a part of a monorepo. so if you make changes in a dependency, you will have to rerun `npm run start` / `pnpm run start-web-sample` (this is a temporary solution until we improve the process to fit to monorepo).

## Optional Attributes

| Attribute                                 | Available options                                                                                                                                                                                                                          | Default value |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------- |
| base-url                                  | Custom Descope base URL                                                                                                                                                                                                                    | **""**        |
| theme                                     | **"light"** - Light theme</br>**"dark"** - Dark theme</br>**"os"** - Auto select a theme based on the OS theme settings                                                                                                                    | **"light"**   |
| debug                                     | **"true"** - Enable debugger</br>**"false"** - Disable debugger                                                                                                                                                                            | **"false"**   |
| preview                                   | **"true"** - Run flow in a preview mode</br>**"false"** - Do run flow in a preview mode                                                                                                                                                    | **"false"**   |
| auto-focus                                | **"true"** - Automatically focus on the first input of each screen</br>**"false"** - Do not automatically focus on screen's inputs</br>**"skipFirstScreen"** - Automatically focus on the first input of each screen, except first screen  | **"true"**    |
| validate-on-blur                          | **"true"** - Triggers the input validation upon blur in addition to the validation on submit</br>**"false"** - Do not triggers validation upon blur</br>                                                                                   | **"false"**   |
| restart-on-error                          | **"true"** - In case of flow version mismatch, will restart the flow if the components version was not changed</br>**"false"** - Do not restart the flow automatically</br>                                                                | **"false"**   |
| storage-prefix                            | **String** - A prefix to add to the key of the local storage when persisting tokens                                                                                                                                                        | **""**        |
| store-last-authenticated-user             | **"true"** - Stores last-authenticated user details in local storage when flow is completed</br>**"false"** - Do not store last-auth user details. Disabling this flag may cause last-authenticated user features to not function properly | **"true"**    |
| keep-last-authenticated-user-after-logout | **"true"** - Do not clear the last authenticated user details from the browser storage after logout</br>**"false"** - Clear the last authenticated user details from the browser storage after logout                                      | **"false"**   |
| style-id                                  | **"String"** - Set a specific style to load rather then the default style                                                                                                                                                                  | **""**        |
| nonce                                     | **"String"** - Set a CSP nonce that will be used for style and script tags                                                                                                                                                                 | **""**        |
| dismiss-screen-error-on-input             | **"true"** - Clear screen error message on user input </br> **"false"** - Do not clear screen error message on user input                                                                                                                  | **"false"**   |

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

### `onScreenUpdate`

A function that is called whenever there is a new screen state and after every next call. It receives the following parameters:

- `screenName`: The name of the screen that is about to be rendered
- `context`: An object containing the upcoming screen state
- `next`: A function that, when called, continues the flow execution
- `ref`: A reference to the descope-wc node

The function can be sync or async, and should return a boolean indicating whether a custom screen should be rendered:

- `true`: Render a custom screen
- `false`: Render the default flow screen

This function allows rendering custom screens instead of the default flow screens.
It can be useful for highly customized UIs or specific logic not covered by the default screens

To render a custom screen, its elements should be appended as children of the `descope-wc` component

Usage example:

```javascript
function onScreenUpdate(screenName, context, next, ref) {
  if (screenName === 'My Custom Screen') {
    ref.innerHTML = `
          <form>
            <input type="text" name="email" placeholder="Email" />
            <button type="submit">Submit</button>
          </form>
        `;

    ref.closest('form').addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData.entries());

      // replace with the button interaction id
      next('interactionId', data);
    });

    return true;
  }

  return false;
}

const descopeWcEle = document.querySelector('descope-wc');

descopeWcEle.onScreenUpdate = onScreenUpdate;
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

### `ready` - Fired when the page is ready.

This event is useful for showing/hiding a loading indication before the page is loading.
Note: in cases where the flow involves redirection to a non-initial stage of the process, such as with Magic Link or OAuth, this event is also dispatched.

Usage example:

```javascript
const descopeWcEle = document.getElementsByTagName('descope-wc')[0];
descopeWcEle.addEventListener('ready', () => {
  // Remove/hide the loading indication
});
```
