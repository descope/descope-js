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
In addition, some browsers (e.g. Safari) may not store `Secure` cookie if the hosted page is running on an HTTP protocol. */
  */
  sessionTokenViaCookie: false,
  /* Automatically schedule a call refresh session call after a successful authentication */
  autoRefresh: true,
});

sdk.onSessionTokenChange((newSession, oldSession) => {
  // handle session token change...
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

### Run Example

To run the example:

1. Clone the repo
1. Install dependencies `pnpm i`
1. Go to package directory `cd packages/web-js-sdk`
1. Run the sample `pnpm run start`

The browser open a tab with directory tree of available examples. Click on the desire directory and follow the instruction.

NOTE: This package is a part of a monorepo. so if you make changes in a dependency, you will have to rerun `npm run start` (this is a temporary solution until we improve the process to fit to monorepo).
