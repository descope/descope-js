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

## Enchanted Link over SMS

The enchanted link can be delivered by SMS instead of email, using `signInWithPhone`,
`signUpWithPhone`, `signUpOrInWithPhone` and `update.phone.sms`. The login ID is a phone number, and
the response is a `PhoneEnchantedLinkResponse`, which carries `maskedPhone` instead of `maskedEmail`.
Unlike the email message, the text message contains only the correct link, so the user has nothing
to choose. Polling with `waitForSession` and verification are unchanged.

```js
const { data } = await sdk.enchantedLink.signUpOrInWithPhone(
  '+11234567890',
  'https://myapp.com/verify-enchanted-link',
);
const jwt = await sdk.enchantedLink.waitForSession(data.pendingRef);
```

## Outbound Connect

Connect to outbound applications (e.g., Google, Microsoft) to access user data from external services.

### Basic Usage

```js
// Connect to an outbound application
const response = await sdk.outbound.connect('app-id', {
  redirectUrl: 'https://your-app.com/callback',
  scopes: ['email', 'profile'],
});

// Redirect user to the returned URL
window.location.href = response.data.url;
```

### Using External Identifier

You can pass an external identifier to map the outbound connection to an external user:

```js
const response = await sdk.outbound.connect('app-id', {
  redirectUrl: 'https://your-app.com/callback',
  scopes: ['email', 'profile'],
  externalIdentifier: 'external-user-id-123',
});
```

### Tenant-Specific Connections

For multi-tenant applications, you can specify tenant-level connections:

```js
const response = await sdk.outbound.connect(
  'app-id',
  {
    redirectUrl: 'https://your-app.com/callback',
    scopes: ['email', 'profile'],
    externalIdentifier: 'external-user-id-123',
    tenantId: 'tenant-123',
    tenantLevel: true,
  },
  'user-session-token',
);
```
