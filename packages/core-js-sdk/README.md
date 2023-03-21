# @descope/core-js-sdk

Descope JavaScript core SDK

## Usage

### Install the package

```bash
npm install @descope/core-js-sdk
```

### Use it

```js
import descopeSdk from '@descope/core-js-sdk';

const myProjectId = 'xxx';
const sdk = descopeSdk({ projectId: myProjectId });

const loginId = 'loginId';

sdk.otp.signIn.email(loginId);
```
