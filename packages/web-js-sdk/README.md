# @descope/web-js-sdk

Descope JavaScript web SDK - Alpha

## Usage

### Install the package

```bash
npm install @descope/web-js-sdk
```

### Use it

```js
import descopeSdk, { getSessionToken } from '@descope/web-js-sdk';

const myProjectId = 'xxx';
// Passing persistTokens as
const sdk = descopeSdk({
  projectId: myProjectId, // Descope Project ID (Required).
  persistTokens: true, // Persist tokens that returned after successful authentication (e.g. sdk.otp.verify.email(...), sdk.refresh(...), flow.next(...), etc.) in browser storage. In addition, if true, it will make `sdk.getSessionToken()` available, see usage bellow bellow.
  autoRefresh: true, // Automatically schedule a call refresh session call after a successful authentication.
});

sdk.onSessionTokenChange((newSession, oldSession) => {
  // handle session token change...
});

sdk.onUserChange((newUser, oldUser) => {
  // handle user change...
});

// For a case that the browser has a valid refresh token on storage/cookie, the user should get a valid session token (e.i. user should be logged-in). For that purpose, it is common to call the refresh function after sdk initialization
// Note that because refresh will return a session token - if autoRefresh is true -
// The sdk will automatically continue to refresh the token
sdk.refresh();

// Alternatively -  use the sdk's available authentication methods to authenticate the user
const userIdentifier = 'identifier';
let res = await sdk.otp.signIn.email(userIdentifier);
if (!res.ok) {
  throw Error('Failed to sign in');
}

// Get the code from email and
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
