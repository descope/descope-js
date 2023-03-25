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
const sdk = descopeSdk({ projectId: myProjectId });

sdk.onSessionTokenChange((newSession, oldSession) => {
  // handle session token change...
});

sdk.onUserChange((newUser, oldUser) => {
  // handle user change...
});
const userIdentifier = 'identifier';
sdk.otp.signIn.email(userIdentifier);

// Get session token
// can be used to pass token to server on header
const sessionToken = getSessionToken();
```

### Run Example

To run the example:

1. Clone the repo
1. Install dependencies `pnpm i`
1. Go to package directory `cd packages/web-js-sdk`
1. Run the sample `pnpm run start`

The browser open a tab with directory tree of available examples. Click on the desire directory and follow the instruction.

NOTE: This package is a part of a monorepo. so if you make changes in a dependency, you will have to rerun `npm run start` (this is a temporary solution until we improve the process to fit to monorepo).
