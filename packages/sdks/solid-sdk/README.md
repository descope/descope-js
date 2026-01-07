# Descope SDK for SolidJS

The Descope SDK for SolidJS provides convenient access to Descope authentication for applications built with SolidJS. You can read more on the [Descope Website](https://descope.com).

## Requirements

- SolidJS version 1.8.0 or above
- A Descope `Project ID` is required. Find it on the [project page in the Descope Console](https://app.descope.com/settings/project).

## Installing the SDK

Install the package with:

```bash
npm install @descope/solid-sdk
# or
pnpm add @descope/solid-sdk
# or
yarn add @descope/solid-sdk
```

## Usage

### Wrap your app with DescopeProvider

```tsx
import { render } from 'solid-js/web';
import { DescopeProvider } from '@descope/solid-sdk';
import App from './App';

render(
  () => (
    <DescopeProvider
      projectId="my-project-id"
      // Optional: If the Descope project manages tokens in cookies, configure a custom domain
      // baseUrl="https://auth.app.example.com"
    >
      <App />
    </DescopeProvider>
  ),
  document.getElementById('root')!,
);
```

### Use Descope to render authentication flows

You can use **default flows** or **provide a flow id** directly to the Descope component.

#### 1. Default flows

```tsx
import { SignInFlow } from '@descope/solid-sdk';

function LoginPage() {
  return (
    <SignInFlow
      onSuccess={(e) => console.log('Logged in!', e.detail)}
      onError={(e) => console.error('Login failed', e.detail)}
    />
  );
}
```

Available default flows:

- `SignInFlow` - Sign in flow
- `SignUpFlow` - Sign up flow
- `SignUpOrInFlow` - Combined sign up or sign in flow

#### 2. Provide flow id

```tsx
import { Descope } from '@descope/solid-sdk';

function LoginPage() {
  return (
    <Descope
      flowId="my-flow-id"
      onSuccess={(e) => console.log('Logged in!', e.detail)}
      onError={(e) => console.error('Could not log in', e.detail)}
      // Optional props:
      // onReady={() => console.log('Flow is ready')}
      // theme="dark"
      // locale="en"
      // debug={true}
      // tenant="tenant-id"
      // redirectUrl="https://my-app.com/callback"
      // autoFocus="skipFirstScreen"
      // validateOnBlur={true}
      // restartOnError={false}
      // errorTransformer={(error) => `Custom: ${error.text}`}
      // form={{ email: "predefined@example.com" }}
      // client={{ version: "1.0.0" }}
      // styleId="my-custom-style"
      // dismissScreenErrorOnInput={true}
      // popupOrigin="https://auth.example.com"
    />
  );
}
```

### Use hooks to access authentication state

The SDK provides several hooks to access authentication state and user information:

```tsx
import { useDescope, useSession, useUser } from '@descope/solid-sdk';
import { Show } from 'solid-js';

function App() {
  const { isAuthenticated, isSessionLoading, sessionToken, claims } =
    useSession();
  const { user, isUserLoading } = useUser();
  const sdk = useDescope();

  const handleLogout = () => {
    sdk.logout();
  };

  return (
    <Show
      when={!isSessionLoading() && !isUserLoading()}
      fallback={<p>Loading...</p>}
    >
      <Show when={isAuthenticated()} fallback={<p>You are not logged in</p>}>
        <div>
          <p>Hello {user()?.name}!</p>
          <p>Email: {user()?.email}</p>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </Show>
    </Show>
  );
}
```

**Note:** Signals in SolidJS are functions - always call them with `()` to get their value (e.g., `user()`, not `user`).

**Note:** `useSession` triggers a single request to refresh the session. If you don't use `useSession`, you can manually trigger the refresh:

```tsx
import { onMount } from 'solid-js';
import { useDescope } from '@descope/solid-sdk';

function App() {
  const sdk = useDescope();

  onMount(() => {
    sdk.refresh();
  });

  return <div>My App</div>;
}
```

### Auto refresh session token

Descope SDK automatically refreshes the session token when it expires. This happens in the background using the refresh token.

To disable auto-refresh, pass `autoRefresh={false}` to `DescopeProvider`:

```tsx
<DescopeProvider projectId="my-project-id" autoRefresh={false}>
  <App />
</DescopeProvider>
```

### Session token server validation

When building full-stack applications, you'll need to validate session tokens on the server.

#### Option 1: Pass token in Authorization header (Recommended)

```tsx
import { getSessionToken } from '@descope/solid-sdk';

async function fetchData() {
  const sessionToken = getSessionToken();
  const response = await fetch('/api/data', {
    headers: {
      Authorization: `Bearer ${sessionToken}`,
    },
  });
  return response.json();
}
```

#### Option 2: Store token in cookie

```tsx
<DescopeProvider
  projectId="my-project-id"
  sessionTokenViaCookie={true}
  // Or with custom options:
  // sessionTokenViaCookie={{
  //   sameSite: 'Lax',
  //   secure: true,
  //   cookieName: 'MY_SESSION'
  // }}
>
  <App />
</DescopeProvider>
```

**Note:** Use this option cautiously as session tokens can grow large, especially with authorization or custom claims.

The cookie is set as `SameSite=Strict; Secure;` by default. Customize with:

- `sameSite` - Controls SameSite attribute (default: `'Strict'`)
- `secure` - If true, cookie is Secure (default: `true`)
- `cookieName` - Custom cookie name (default: `'DS'`)
- `domain` - Cookie domain (default: auto-detected)

### Helper Functions

```tsx
import {
  getSessionToken,
  getRefreshToken,
  refresh,
  isSessionTokenExpired,
  isRefreshTokenExpired,
  getJwtRoles,
  getJwtPermissions,
  getCurrentTenant,
} from '@descope/solid-sdk';

const sessionToken = getSessionToken();
const refreshToken = getRefreshToken();

await refresh(refreshToken);

const expired = isSessionTokenExpired(sessionToken);
const refreshExpired = isRefreshTokenExpired(refreshToken);

const roles = getJwtRoles(sessionToken, 'tenant-id');
const permissions = getJwtPermissions(sessionToken, 'tenant-id');
const tenantId = getCurrentTenant(sessionToken);
```

### Token Persistence

Descope stores tokens in either local storage or cookies:

- **Refresh token**: Configured in Descope console (local storage or httpOnly cookie)
- **Session token**: Configured via `sessionTokenViaCookie` prop (local storage or JS cookie)

To prevent token storage in the browser, pass `persistTokens={false}`:

```tsx
<DescopeProvider projectId="my-project-id" persistTokens={false}>
  <App />
</DescopeProvider>
```

**Important:** You must configure the refresh token to be stored in an httpOnly cookie in the Descope console, or users will be logged out on page refresh.

### Custom Refresh Cookie Name

When managing multiple Descope projects on the same domain, use custom cookie names:

```tsx
<DescopeProvider projectId="my-project-id" refreshCookieName="MY_DSR">
  <App />
</DescopeProvider>
```

### Widgets

Widgets allow you to embed management UIs for tenant administrators.

#### User Management

```tsx
import { UserManagement } from '@descope/solid-sdk';

function AdminPage() {
  return (
    <UserManagement widgetId="user-management-widget" tenant="tenant-id" />
  );
}
```

#### Role Management

```tsx
import { RoleManagement } from '@descope/solid-sdk';

function AdminPage() {
  return (
    <RoleManagement widgetId="role-management-widget" tenant="tenant-id" />
  );
}
```

#### Access Key Management

```tsx
import { AccessKeyManagement } from '@descope/solid-sdk';

function AdminPage() {
  return (
    <AccessKeyManagement
      widgetId="access-key-management-widget"
      tenant="tenant-id"
    />
  );
}
```

#### Audit Management

```tsx
import { AuditManagement } from '@descope/solid-sdk';

function AdminPage() {
  return (
    <AuditManagement widgetId="audit-management-widget" tenant="tenant-id" />
  );
}
```

#### User Profile

```tsx
import { UserProfile } from '@descope/solid-sdk';

function ProfilePage() {
  return (
    <UserProfile
      widgetId="user-profile-widget"
      onLogout={() => (window.location.href = '/login')}
    />
  );
}
```

#### Applications Portal

```tsx
import { ApplicationsPortal } from '@descope/solid-sdk';

function AppsPage() {
  return <ApplicationsPortal widgetId="applications-portal-widget" />;
}
```

### SolidStart / SSR Support

The SDK is SSR-compatible and initializes client-side only. Session restoration happens on hydration.

**Limitation:** Server-side auth evaluation is not supported - authentication happens client-side.

```tsx
import { Router } from '@solidjs/router';
import { DescopeProvider } from '@descope/solid-sdk';

export default function App() {
  return (
    <Router
      root={(props) => (
        <DescopeProvider projectId="my-project-id">
          {props.children}
        </DescopeProvider>
      )}
    >
      {/* routes */}
    </Router>
  );
}
```

### OIDC Login

The SDK supports OIDC authentication:

```tsx
<DescopeProvider
  projectId="my-project-id"
  oidcConfig={true}
  // Or with custom configuration:
  // oidcConfig={{
  //   applicationId: 'my-app-id',
  //   redirectUri: 'https://my-app.com/callback',
  //   scope: 'openid profile email',
  // }}
>
  <App />
</DescopeProvider>
```

#### Start OIDC login:

```tsx
import { useDescope } from '@descope/solid-sdk';

function LoginButton() {
  const sdk = useDescope();

  const handleLogin = () => {
    sdk.oidc.loginWithRedirect({
      redirect_uri: window.location.origin,
    });
  };

  return <button onClick={handleLogin}>Login with OIDC</button>;
}
```

The SDK automatically handles the redirect back from the OIDC provider.

#### OIDC logout:

```tsx
const sdk = useDescope();

const handleLogout = () => {
  sdk.oidc.logout({
    post_logout_redirect_uri: window.location.origin + '/after-logout',
  });
};
```

## Code Example

See the [examples/basic](./examples/basic) directory for a complete SolidStart example application.

## Learn More

- [Descope Documentation](https://docs.descope.com/)
- [SolidJS Documentation](https://www.solidjs.com/)
- [API Reference](https://docs.descope.com/api/)

## Contact Us

If you need help, email [Descope Support](mailto:support@descope.com)

## License

The Descope SDK for SolidJS is licensed under the [MIT License](./LICENSE).
