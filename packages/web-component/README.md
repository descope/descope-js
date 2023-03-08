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
import '@descope/web-component'
import { DescopeWc } // in case you need types definition or you want to use the class directly

//render a custom element, for example:
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

### Run the demo app

- Install dependencies - `npm i`
- Create a `.env` file and add the following parameters:

```env
// .env
DESCOPE_BASE_URL=<base-url>
DESCOPE_FLOW_ID=<flow-id>
DESCOPE_PROJECT_ID=<project-id>
```

- Run application - `npm run start`

_TODO: we should host this file so it can be included without installing the package, once we will publish it to a public registry, we can also use unpkg.com/ to serve it_

## Optional Attributes

| Attribute    | Available options                                                                                                                                                                                                                         | Default value |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| theme        | **"light"** - Light theme</br>**"dark"** - Dark theme</br>**"os"** - Auto select a theme based on the OS theme settings                                                                                                                   | **"light"**   |
| debug        | **"true"** - Enable debugger</br>**"false"** - Disable debugger                                                                                                                                                                           | **"false"**   |
| telemetryKey | **String** - Telemetry public key provided by Descope Inc                                                                                                                                                                                 | **""**        |
| auto-focus   | **"true"** - Automatically focus on the first input of each screen</br>**"false"** - Do not automatically focus on screen's inputs</br>**"skipFirstScreen"** - Automatically focus on the first input of each screen, except first screen | **"true"**    |
|              |                                                                                                                                                                                                                                           |               |
