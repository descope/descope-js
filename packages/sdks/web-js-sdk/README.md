# @descope/web-js-sdk

Descope JavaScript web SDK

## Usage

### Install the package

```bash
npm install @descope/web-js-sdk
```

### Use it

```js
import descopeSdk from '@descope/web-js-sdk';

const myProjectId = 'xxx';

const sdk = descopeSdk({
  /* Descope Project ID (Required) */
  projectId: myProjectId,
  /* Persist tokens that returned after successful authentication (e.g. sdk.otp.verify.email(...),
  sdk.refresh(...), flow.next(...), etc.) in browser storage. In addition, this will
  make `sdk.getSessionToken()` available, see usage bellow bellow */
  persistTokens: true,
  /* Pass `sessionTokenViaCookie: true` to store the session token in a cookie when using `persistTokens`. By default, the sdk will set the session token in the browser storage.
  Notes:
    - This option is relevant only when `persistTokens` is true.
    - The session token cookie is set as a [`Secure`](https://datatracker.ietf.org/doc/html/rfc6265#section-5.2.5) cookie. It will be sent only over HTTPS connections.
In addition, some browsers (e.g. Safari) may not store `Secure` cookie if the hosted page is running on an HTTP protocol.
    - The session token cookie is set to [`SameSite=Strict; Secure;`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie) by default.
  If you need to customize this, you can set `sessionTokenViaCookie: {sameSite: 'Lax', secure: false}` (if you pass only `sameSite`, `secure` will be set to `true` by default).
    - If the cookie domain set on Descope configuration doesn't match, or is not a parent domain of the current domain, The cookie will be stored on the current domain that runs the code. Examples:
     - Project cookie domain is acme.com, current domain is app.acme.com - the domain will be set to app.acme.com
     - Project cookie domain is acme.com, current domain is my-app.com - the domain will be set to my-app.com
     */
  */
  sessionTokenViaCookie: false,
  /* Automatically schedule a call refresh session call after a successful authentication:
  Note: due to browser limitation, the maximum interval for the refresh has an upper bound of 2^32 - 1 milliseconds (approximately 24.8 days).
  */
  autoRefresh: true,
  /* Disable storing the last authenticated user details on the browser storage (default is true).
  Note: Disabling this flag may cause features related to the last-authenticated user to not function properly.
  */
  storeLastAuthenticatedUser: false, // default is true
  /* Do not clear the last authenticated user details from the browser storage after logout (default is false).
  Note: This flag is relevant only when `storeLastAuthenticatedUser` is true.
  */
  keepLastAuthenticatedUserAfterLogout: true, // default is false

  /*  When managing multiple Descope projects on the same domain, you can prevent refresh cookie conflicts by assigning a custom name to your refresh token cookie during the login process (for example, using Descope Flows). However, you must also configure the SDK to recognize this unique name by passing the `refreshCookieName` option.
  */
  refreshCookieName: "cookie-1"

  // Pass this function to the SDK if you want to seamlessly migrate session from an external authentication provider to Descope.
  getExternalToken: async () => {
    // Bring token from external provider (e.g. get access token from another auth provider)
    return 'my-external-token';
  },
});

sdk.onSessionTokenChange((newSession, oldSession) => {
  // handle session token change...
  // Note that if Descope project settings are configured to manage session token in cookies, the session token will not be available in the browser.
});

sdk.onIsAuthenticatedChange((isAuthenticated) => {
  // handle authentication change...
});

sdk.onUserChange((newUser, oldUser) => {
  // handle user change...
});

/* For a case that the browser has a valid refresh token on storage/cookie,
the user should get a valid session token (e.i. user should be logged-in).
For that purpose, it is common to call the refresh function after sdk initialization.
Note: Refresh return a session token, so if the autoRefresh was provided, the sdk will
automatically continue to refresh the token */
sdk.refresh();

// Alternatively -  use the sdk's available authentication methods to authenticate the user
const userIdentifier = 'identifier';
let res = await sdk.otp.signIn.email(userIdentifier);
if (!res.ok) {
  throw Error('Failed to sign in');
}

// Get the one time code from email and verify it
const codeFromEmail = '1234';
res = await sdk.otp.verify.email(userIdentifier, codeFromEmail);
if (!res.ok) {
  throw Error('Failed to sign in');
}

// Get session token
// Can be used to pass token to server on header
const sessionToken = sdk.getSessionToken();
```

### Usage with OIDC

Descope also supports OIDC login. To enable OIDC login, pass `oidcConfig` attribute to the SDK initialization. The `oidcConfig` attribute is either a boolean or a configuration object. If you pass `oidcConfig: true`, the SDK will use the Descope OIDC default application

```js
// Initialize the SDK with OIDC
const sdk = descopeSdk({
  projectId: 'xxx',
  oidcConfig: true,
});

// Initialize the SDK with custom OIDC application
const sdk = descopeSdk({
  projectId: 'xxx',
  oidcConfig: {
    applicationId: 'my-application-id', // optional, if not provided, the default OIDC application will be used

    redirectUri: 'https://my-app.com/redirect', // optional, if not provided, the default redirect URI will be used

    scope: 'openid profile email', // optional, if not provided, default is openid email offline_access roles descope.custom_claims
  },
});
```

#### Start OIDC login

Login with OIDC is done by calling the `loginWithRedirect` method. This method will redirect the user to the Descope OIDC login page. After the user logs in, they will be redirected back to the application to finish the login process.

```js
await sdk.oidc.loginWithRedirect({
  // By default, the login will redirect the user to the current URL
  // If you want to redirect the user to a different URL, you can specify it here
  redirect_uri: window.location.origin,
});
```

#### Finish OIDC login

After the user is redirected back to the application with oidc code and state query parameters, you need to call the `oidc.finishLogin` or `oidc.finishLoginIfNeed` methods to finish the login process

Using `finishLoginIfNeed` (recommended):

```js
// Call this method to finish the login process.
// This method will only finish the login process if the user was redirected back to the application after login.
await sdk.oidc.finishLoginIfNeed();
```

Using `finishLogin`:

```js
// Call this method to finish the login process, which takes the code and state query parameters from the URL, and exchanges them for a session
// Note: Call this method only if the user was redirected back to the application after login, this is usually done according the the code/state query parameters
await sdk.oidc.finishLogin();
```

#### Manage OIDC session

The SDK will automatically manage the OIDC session for you, according to `persistTokens` and `autoRefresh` options. The SDK will automatically refresh the OIDC session when it expires, and will store the session token in the browser storage or cookies, according to the `persistTokens` option.

### Run Example

To run the example:

1. Install dependencies `pnpm i`
1. Run the sample `pnpm run start`

The browser open a tab with directory tree of available examples. Click on the desire directory and follow the instruction.

NOTE: This package is a part of a monorepo. so if you make changes in a dependency, you will have to rerun `npm run start` (this is a temporary solution until we improve the process to fit to monorepo).
