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
