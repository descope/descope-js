# SDK Scripts

### What is SDK Scripts?

This folder contains the SDK scripts that should load in the web component.
The scripts are a pre-defined code that should run on the FE side when the flow start
(There are use cases that such script should run before the flow starts, for example, to load a 3rd party library for fraud detection.)

### How does it work?

1. The flow config entry, (inside `config.json`, that is loaded on flow start) should to include the following:

```json
{
  // ...
  "sdkScripts": {
    "id": "script-id", // e.g. "forter"
    "resultKey": "result-key", // e.g. "token
    "initArgs": {
      /* Arguments that passed to the script*/
    }
  }
}
```

2. The Descope Web Component will load and run the script from the `sdkScripts` folder and will
   a. run it with the `initArgs` as arguments.
   b. pass a callback to the script, that will save the result in the `<script-id>_<result-key>` in the flow context.

3. on start/next requests, the input will include the `<script-id>_<result-key>` under `sdkScriptsResults` key.

### How to add a new SDK script?

First, ensure that the Descope service supports the new script.
Then, follow the following steps:

1. Create a new file under `sdkScripts` with the script id. for example, if the script id is `forter`, the file should be `forter.ts`.

2. The file should export default a function that will run the script. The function should accept the following arguments:

   - `args` - the `initArgs` from the flow config.
   - `config` - a subset of component configuration. (currently passing only `baseUrl`)
   - `callback` - a function that should be called with the result of the script.

3. Add an entry to switch in the `loadSdkScript` function in `index.ts` that will load the script. that matches the script id to the file name.
