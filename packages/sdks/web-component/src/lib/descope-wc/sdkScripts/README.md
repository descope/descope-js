# SDK Scripts

### What are SDK Scripts?

This folder contains SDK scripts that should load in the web component. These scripts are pre-defined code that should run on the front-end when the flow starts. In some cases, these scripts should run before the flow starts, for example, to load a third-party library for fraud detection.

### How does it work?

1. The flow config entry (inside `config.json`, which is loaded when the flow starts) should include the following:

   ```json
   {
     // ...
     "sdkScripts": {
       "id": "script-id", // e.g., "forter"
       "resultKey": "result-key", // e.g., "token" (optional)
       "initArgs": {
         /* Arguments passed to the script */
       }
     }
   }
   ```

   If `resultKey` is omitted, the result of the script will be stored under `<script-id>`.

2. The Descope Web Component will load and run the script from the `sdkScripts` folder and will:
   a. Run it with the `initArgs` as arguments.
   b. Pass a callback to the script that will save the result in the `<script-id>_<result-key>` (or `<script-id>` if `resultKey` is not provided) in the flow context.

3. On start/next requests, the input will include the `<script-id>_<result-key>` (or `<script-id>`, if `resultKey` was not provided) under the `sdkScriptsResults` key.

### How to add a new SDK script?

First, ensure that the Descope service supports the new script. Then, follow these steps:

1. Create a new file under `sdkScripts` with the script ID. For example, if the script ID is `forter`, the file should be `forter.ts`.

2. The file should export a default function that will run the script. The function should accept the following arguments:

   - `args` - the `initArgs` from the flow config.
   - `config` - a subset of component configuration (currently passing only `baseUrl`).
   - `callback` - a function that should be called with the result of the script.

3. Add an entry to the switch in the `loadSdkScript` function in `index.ts` that matches the script ID to the file name.
