# @descope/core-js-sdk

Descope JavaScript core SDK

## Usage

### Install the package

```bash
npm install @descope/core-js-sdk
```

### Use it

```js
import createSdk from '@descope/core-js-sdk';

const projectId = '<project-id>';

const sdk = createSdk({ projectId });

const loginId = 'loginId';

sdk.otp.signIn.email(loginId);
```
