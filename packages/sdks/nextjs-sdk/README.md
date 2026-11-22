# Descope SDK for Next.js

The Descope SDK for Next.js provides convenient access to the Descope for an application written on top of Next.js. You can read more on the [Descope Website](https://descope.com).

This SDK uses under the hood the Descope React SDK and Descope Node SDK
Refer to the [Descope React SDK](https://github.com/descope/descope-js/tree/main/packages/sdks/react-sdk) and [Descope Node SDK](https://github.com/descope/node-sdk) for more details.

## Requirements

- The SDK supports Next.js version 13 and above.
- A Descope `Project ID` is required for using the SDK. Find it on the [project page in the Descope Console](https://app.descope.com/settings/project).

## Installing the SDK

Install the package with:

```bash
npm i --save @descope/nextjs-sdk
```

## Usage

This section contains guides for App router and Pages router.
For Pages router, see the [Pages Router](#pages-router) section.

### App Router

#### Wrap your app layout with Auth Provider

```js
// src/app/layout.tsx

import { AuthProvider } from '@descope/nextjs-sdk';

export default function RootLayout({
	children
}: {
	children: React.ReactNode
}) {
	return (
		<AuthProvider projectId="your-descope-project-id">
			<html lang="en">
				<body>{children}</body>
			</html>
		</AuthProvider>
	);
}
```

Note: `AuthProvider` uses `sessionTokenViaCookie={{ sameSite: 'Lax' }}` by default, in order that the [AuthMiddleware](<#Require-authentication-for-application-(Middleware)>) will work out of the box.
The session token cookie is set to [`SameSite=Lax; Secure;`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie) by default.
If you need to customize this, you can set `sessionTokenViaCookie={{sameSite: 'Strict'}}` (if you pass only `sameSite`, `secure` will be set to `true` by default).

#### Use Descope to render Flow

You can use **default flows** or **provide flow id** directly to the Descope component

```js
// Login page, e.g. src/app/sign-in.tsx
import { Descope } from '@descope/nextjs-sdk';
// you can choose flow to run from the following without `flowId` instead
// import { SignInFlow, SignUpFlow, SignUpOrInFlow } from '@descope/nextjs-sdk'

const Page = () => {
	return (
		<Descope
			flowId="sign-up-or-in"
			onSuccess={(e) => console.log('Logged in!')}
			onError={(e) => console.log('Could not logged in!')}
			redirectAfterSuccess="/"
			// redirectAfterError="/error-page"
		/>
	);
};
```

This minimal page always sends users to `/` and shows the flow even when the session can still be renewed. For a production sign-in page that returns users to the page they asked for, see [What the app is expected to do](#what-the-app-is-expected-to-do).

Refer to the [Descope React SDK Section](../react-sdk/README.md) for a list of available props.

> **Breaking change (v-next):** if you render custom screens via `onScreenUpdate`, the
> server-produced screen data that used to sit directly on `context` now lives under
> **`context.data`** — e.g. `context.totp` → `context.data.totp`. See the
> [React SDK `onScreenUpdate` section](../react-sdk/README.md#onscreenupdate) and the
> [@descope/web-component README](https://www.npmjs.com/package/@descope/web-component#the-context-object)
> for the full list of `context.data` fields.

**Note:** Descope is a client component. if the component that renders it is a server component, you cannot pass `onSuccess`/`onError`/`errorTransformer`/`logger` props because they are not serializable. To redirect the user after the flow is completed, use the `redirectAfterSuccess` and `redirectAfterError` props.

#### Client Side Usage

Use the `useDescope`, `useSession` and `useUser` hooks in your components in order to get authentication state, user details and utilities

This can be helpful to implement application-specific logic. Examples:

- Render different components if current session is authenticated
- Render user's content
- Logout button

Note: these hooks should be used in a client component only (For example, component with `use client` notation).

```js
'use client';
import { useDescope, useSession, useUser } from '@descope/nextjs-sdk/client';
import { useCallback } from 'react';

const App = () => {
	// NOTE - `useDescope`, `useSession`, `useUser` should be used inside `AuthProvider` context,
	// and will throw an exception if this requirement is not met
	// useSession retrieves authentication state, session loading status, and session token
	// Use `isAuthenticated` to check whether there is an active session - not `sessionToken`
	const { isAuthenticated, isSessionLoading, sessionToken } = useSession();
	// useUser retrieves the logged in user information
	const { user } = useUser();
	// useDescope retrieves Descope SDK for further operations related to authentication
	// such as logout
	const sdk = useDescope();

	if (isSessionLoading || isUserLoading) {
		return <p>Loading...</p>;
	}

	const handleLogout = useCallback(() => {
		sdk.logout();
	}, [sdk]);

	if (isAuthenticated) {
		return (
			<>
				<p>Hello {user.name}</p>
				<button onClick={handleLogout}>Logout</button>
			</>
		);
	}

	return <p>You are not logged in</p>;
};
```

> **Important:** always use `isAuthenticated` to determine whether there is an active session - never `sessionToken`.
>
> `sessionToken` is empty whenever the session token is not accessible to client-side code, for example when the Descope project is configured to manage the session token in cookies (`Secure` + `HttpOnly` `DS` cookie), or when `persistTokens={false}` is set. In those setups the user is fully authenticated while `sessionToken` is an empty string, so guarding logic on it silently skips that logic:
>
> ```js
> // WRONG - skipped for authenticated users when the session token lives in an HttpOnly cookie
> if (!sessionToken && !isSessionLoading) {
> 	return; // e.g. bailing out before calling sdk.logout()
> }
>
> // CORRECT
> if (!isAuthenticated && !isSessionLoading) {
> 	return;
> }
> ```
>
> `isAuthenticated` is derived from the session's expiration, which the SDK receives in every token-storage mode. Read `sessionToken` only when you actually need the raw JWT (for example to attach it to an API request), and use `claims` to read claims out of the session. On the server side, use [`session()`](#read-session-information-in-server-side) instead.

#### Activity-Based Session Refresh

By default, the SDK fires a periodic heartbeat (refresh call) whenever the tab is active. You can opt in to fine-grained control by passing `autoRefresh={{ customActivityTracking: true }}` to `AuthProvider`. With this mode enabled, the SDK only refreshes when `sdk.markUserActive()` has been called since the last refresh — useful for enforcing server-side inactivity timeouts.

**Step 1:** Enable it in `AuthProvider`:

```tsx
import { AuthProvider } from '@descope/nextjs-sdk';

<AuthProvider
	projectId="my-project-id"
	autoRefresh={{ customActivityTracking: true }}
>
	<App />
</AuthProvider>;
```

**Step 2:** Call `markUserActive()` on user interactions using the `useDescope` hook from `@descope/nextjs-sdk/client`:

```tsx
'use client';
import { useEffect } from 'react';
import { useDescope } from '@descope/nextjs-sdk/client';

function useActivityTracking() {
	const sdk = useDescope();

	useEffect(() => {
		const { markUserActive } = sdk;

		document.addEventListener('click', markUserActive);
		document.addEventListener('keydown', markUserActive);
		document.addEventListener('touchstart', markUserActive);

		const onVisibility = () => {
			if (document.visibilityState === 'visible') markUserActive();
		};
		document.addEventListener('visibilitychange', onVisibility);

		return () => {
			document.removeEventListener('click', markUserActive);
			document.removeEventListener('keydown', markUserActive);
			document.removeEventListener('touchstart', markUserActive);
			document.removeEventListener('visibilitychange', onVisibility);
		};
	}, [sdk]);
}
```

Call `useActivityTracking()` inside a client component rendered within `<AuthProvider>`.

#### Trigger Auto Refresh

`useSession` triggers a single request to the Descope backend to attempt to refresh the session. If you **don't** `useSession` in your app, the session will not be refreshed automatically. If your app does not require `useSession`, you can trigger the refresh manually by calling `refresh` from `useDescope` hook. Example:

```js
import { useEffect } from 'react';

const { refresh } = useDescope();
useEffect(() => {
	refresh().catch(console.error);
}, [refresh]);
```

#### Server Side Usage

##### Require authentication for application (Middleware)

You can use Next.js Middleware to require authentication for a page/route or a group of pages/routes.

Descope SDK provides a middleware function that can be used to require authentication for a page/route or a group of pages/routes.

```js
// src/middleware.ts
import { authMiddleware } from '@descope/nextjs-sdk/server'

export default authMiddleware({
	// The Descope project ID to use for authentication
	// Defaults to process.env.NEXT_PUBLIC_DESCOPE_PROJECT_ID
	projectId: 'your-descope-project-id',

	// The URL to redirect to if the user is not authenticated
	// Defaults to process.env.SIGN_IN_ROUTE or '/sign-in' if not provided
	// NOTE: In case it contains query parameters that exist in the original URL, they will override the original query parameters. e.g. if the original URL is /page?param1=1&param2=2 and the redirect URL is /sign-in?param1=3, the final redirect URL will be /sign-in?param1=3&param2=2
	redirectUrl?: string,

	// These are the public and private routes in your app. You can also use wildcards (e.g. /api/*) with routes as well in these definitions.
	// Read more about how to use these below.
	publicRoutes?: string[],
	privateRoutes?: string[]
	// If you having privateRoutes and publicRoutes defined at the same time, privateRoutes will be ignored.

  // Optional: log level for the middleware
  // Defaults to 'info'
  // logLevel: 'debug' | 'info' | 'warn' | 'error'

	// Optional: skip the refresh token validation fallback
	// Defaults to false
	skipRefreshTokenValidation?: boolean
})

export const config = {
	matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)']
}
```

##### Public and Private Route Definitions

- **All routes are private by default.**
- **`publicRoutes`:** Use this to specify which routes do not require authentication. If specified, only these routes and the default public routes will be public.
- **`privateRoutes`:** Use this to specify which routes require authentication. If specified, only these routes will be private, and all other routes will be public.
- **Conflict Handling:** If both `publicRoutes` and `privateRoutes` are provided, `privateRoutes` will be ignored, and a warning will be logged.

This setup ensures that you can clearly define which routes in your application require authentication and which do not, while providing a mechanism to handle potential misconfigurations gracefully.

###### Public Routes

- **Description:** An array of public routes that do not require authentication.
- **Configuration:** Use `publicRoutes` to specify routes that don't require authentication.
- **Additional Defaults:** In addition to the routes you specify, the following default public routes are included:
  - `process.env.SIGN_IN_ROUTE` or `/sign-in` if not provided
  - `process.env.SIGN_UP_ROUTE` or `/sign-up` if not provided
- **Example:**
  ```typescript
  const options = {
  	publicRoutes: ['/home', '/about']
  };
  ```

###### Private Routes

- **Description:** An array of private routes that require authentication.
- **Configuration:** Use `privateRoutes` to specify routes that require authentication. All other routes will be considered public.
- **Conflict Handling:** If both `publicRoutes` and `privateRoutes` are defined at the same time, `privateRoutes` will be ignored, and a warning will be logged.
- **Example:**
  ```typescript
  const options = {
  	privateRoutes: ['/dashboard', '/profile']
  };
  ```

##### Skipping Refresh Token Validation

By default, when the session token is missing or expired, the middleware falls back to validating the refresh token, and lets the request through if it is valid.
The middleware does not refresh the session, so server side code that relies on `session()` will still see no valid session.

Set `skipRefreshTokenValidation: true` to require a valid session token - requests with only a valid refresh token will be redirected to the sign-in route.
This is useful when your server side code needs a valid session on every private route.

```typescript
const options = {
	skipRefreshTokenValidation: true
};
```

###### What the app is expected to do

A user with an expired session token and a still valid refresh token is redirected to the sign-in route. They don't need to sign in again: the browser SDK can renew the session token from the refresh token. Your app has to let it, then send the user back. That takes these pieces:

1. **Keep the requested page.** The redirect replaces the original pathname and only carries over its query parameters, so add the path as `next` yourself. Apply `skipRefreshTokenValidation` to page loads only, so a user with a valid refresh token is not redirected in the middle of a server action or API call. Those handlers check `session()` themselves. If the app sets `basePath`, or serves GET route handlers outside `/api`, adjust the sign-in URL and the `isPageLoad` check.

```ts
// src/proxy.ts (Next.js 16+) or src/middleware.ts (Next.js 13-15)
import { NextResponse, type NextRequest } from 'next/server';
import { authMiddleware } from '@descope/nextjs-sdk/server';

// Added to the defaults ('/sign-in', '/sign-up'). All other routes are private.
const publicRoutes = ['/', '/sign-in', '/api/public/*'];

const pageAuth = authMiddleware({
	// projectId defaults to process.env.NEXT_PUBLIC_DESCOPE_PROJECT_ID
	redirectUrl: '/sign-in',
	publicRoutes,
	skipRefreshTokenValidation: true
});

const requestAuth = authMiddleware({ redirectUrl: '/sign-in', publicRoutes });

export default async function proxy(req: NextRequest) {
	const isPageLoad =
		req.method === 'GET' &&
		!req.headers.has('next-action') &&
		!req.nextUrl.pathname.startsWith('/api');
	if (!isPageLoad) return requestAuth(req);

	const res = await pageAuth(req);
	if (res.headers.get('location')) {
		// Redirected to sign-in: remember the page the user asked for.
		const signIn = new URL('/sign-in', req.url);
		signIn.searchParams.set('next', req.nextUrl.pathname + req.nextUrl.search);
		return NextResponse.redirect(signIn);
	}
	return res;
}

export const config = {
	matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)']
};
```

2. **Wait for renewal on the sign-in page.** `<Descope redirectAfterSuccess="/" />` is not enough: it shows the flow to a user whose refresh token is still valid and drops the page they asked for. Wait for `useSession()` to finish loading and return an authenticated user to `next`. Validate `next` by parsing it as a URL: browsers strip tabs and newlines, so string checks such as `startsWith('/')` let `/%09/evil.com` through.

```tsx
// src/app/sign-in/page.tsx
'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Descope } from '@descope/nextjs-sdk';
import { useSession } from '@descope/nextjs-sdk/client';
import { ensureFreshSession } from '@/lib/ensureFreshSession';

// Only allow paths inside this app, so ?next= can't send users to another site.
// Parse instead of string checks: browsers strip tabs and newlines from URLs, so
// "/\t/evil.com" passes a startsWith('/') check and still leaves the site.
function safeNext(value: string | null): string {
	if (!value) return '/';
	try {
		const base = 'http://app.invalid'; // placeholder origin, only used for parsing
		const url = new URL(value, base);
		if (
			url.origin !== base ||
			url.pathname.startsWith('//') ||
			url.pathname.startsWith('/sign-in')
		) {
			return '/';
		}
		return url.pathname + url.search + url.hash;
	} catch {
		return '/';
	}
}

const LAST_RETURN_KEY = 'sign-in-last-return';

function SignIn() {
	const router = useRouter();
	const params = useSearchParams();
	const next = safeNext(params.get('next'));
	const renewFailed = params.has('renewFailed');
	const { isAuthenticated, isSessionLoading } = useSession();

	const returning = useRef(false);

	useEffect(() => {
		// Run once per mount: React Strict Mode runs effects twice in development.
		if (!isAuthenticated || renewFailed || returning.current) return;
		returning.current = true;
		(async () => {
			// The SDK can report a session whose token is still being renewed.
			await ensureFreshSession();
			// Sent back here seconds after returning the user: the server is rejecting the
			// renewed session. Show the login flow instead of looping.
			const last = Number(sessionStorage.getItem(LAST_RETURN_KEY) ?? 0);
			if (Date.now() - last < 10_000) {
				router.replace(
					`/sign-in?renewFailed=1&next=${encodeURIComponent(next)}`
				);
				return;
			}
			sessionStorage.setItem(LAST_RETURN_KEY, String(Date.now()));
			router.replace(next);
		})();
	}, [isAuthenticated, renewFailed, next, router]);

	// Let the SDK renew the session from the refresh token before showing the login flow.
	if (!renewFailed && (isSessionLoading || isAuthenticated)) {
		return <p>Checking your session...</p>;
	}

	return (
		<Descope
			flowId="sign-up-or-in"
			onSuccess={() => {
				sessionStorage.removeItem(LAST_RETURN_KEY);
				router.replace(next);
			}}
			onError={(e) => console.error('Auth failed:', e.detail)}
		/>
	);
}

export default function SignInPage() {
	return (
		<Suspense>
			<SignIn />
		</Suspense>
	);
}
```

3. **Refresh on every page.** `AuthProvider` alone does not refresh the session: the SDK starts once a component calls `useSession()`, and then also renews an expired token when the user returns to the tab. Render this once inside `AuthProvider` in the root layout.

```tsx
// src/app/components/SessionKeeper.tsx
'use client';

import { useSession } from '@descope/nextjs-sdk/client';

export function SessionKeeper() {
	useSession(); // starts the SDK's session refresh on every page
	return null;
}
```

4. **Wait for renewal before server actions.** Right after the user returns to a background tab, the renewal is still in flight. From a client component, wait for it before calling a server action. The action still checks `session()` itself.

```ts
// src/lib/ensureFreshSession.ts
'use client';

import {
	getSessionToken,
	isSessionTokenExpired,
	refresh
} from '@descope/nextjs-sdk/client';

export async function ensureFreshSession() {
	const token = getSessionToken();
	// getSessionToken() returns '' when Descope manages the token as an HttpOnly
	// cookie. Then this does nothing and the SDK's background renewal applies.
	if (token && isSessionTokenExpired(token)) {
		await refresh().catch(() => {});
	}
}
```

```tsx
// src/app/projects/[id]/settings/SaveForm.tsx
'use client';

import { ensureFreshSession } from '@/lib/ensureFreshSession';
import { saveDescription } from './actions';

export function SaveForm({ id }: { id: string }) {
	return (
		<form
			action={async (formData) => {
				await ensureFreshSession();
				await saveDescription(id, formData);
			}}
		>
			<input name="description" />
			<button type="submit">Save</button>
		</form>
	);
}
```

##### Read session information in server side

use the `session()` helper to read session information in Server Components and Route handlers.

Note: While using `authMiddleware` is still recommended for session management (because it validates the session only once), `session()` can function without it. If `authMiddleware` does not set a session, `session()` will attempt to retrieve the session token from cookies, then parse and validate it.

Server Component:

```js
// src/app/page.tsx

import { session } from '@descope/nextjs-sdk/server';

async function Page() {
	const sessionRes = await session();
	if (!sessionRes) {
		// ...
	}
	// Use the session jwt or parsed token
	const { jwt, token } = sessionRes;
}
```

Route handler:

```js
// src/pages/api/routes.ts
export async function GET() {
	const currSession = await session();
	if (!currSession) {
		// ...
	}

	// Use the session jwt or parsed token
	const { jwt, token } = currSession;
}
```

The `session()` function uses Next.js's `cookies()` and `headers()` functions to retrieve the session token. If you are using Next.js Version 13, you can use the `getSession(req)` instead.

```js
import { getSession } from '@descope/nextjs-sdk/server';

export async function GET(req) {
	const currSession = await getSession(req);

	// ...
}
```

##### Optional Parameters

If the middleware did not set a session, The `session()` function will attempt to retrieve the session token from cookies and validates it, this requires the project ID to be either set in the environment variables or passed as a parameter to the function.
You can also pass the log level to the function (defaults to 'info').

```
session({
  projectId?: string;
  baseUrl?: string;
  logLevel?: 'debug' | 'info' | 'warn' | 'error'
})
```

- **projectId:** The Descope Project ID. If not provided, the function will fall back to `NEXT_PUBLIC_DESCOPE_PROJECT_ID` from the environment variables.
- **baseUrl:** The Descope API base URL.

This allows developers to use `session()` even if the project ID is not set in the environment.

#### Access Descope SDK in server side

Use `createSdk` function to create Descope SDK in server side.

Refer to the [Descope Node SDK](https://github.com/descope/node-sdk/?tab=readme-ov-file#authentication-functions) for a list of available functions.

Usage example in Route handler:

```js
// src/pages/api/routes.ts
import { createSdk } from '@descope/nextjs-sdk/server';

const sdk = createSdk({
	// The Descope project ID to use for authentication
	// Defaults to process.env.NEXT_PUBLIC_DESCOPE_PROJECT_ID
	projectId: 'your-descope-project-id',

	// The Descope management key to use for management operations
	// Defaults to process.env.DESCOPE_MANAGEMENT_KEY
	managementKey: 'your-descope-management-key'

	// Optional: Descope API base URL
	// Defaults to process.env.NEXT_PUBLIC_DESCOPE_BASE_URL
	// baseUrl: 'https://...'
});

export async function GET(req) {
	const { searchParams } = new URL(req.url);
	const loginId = searchParams.get('loginId');

	const { ok, data: user } = await sdk.management.user.load(loginId);
	if (!ok) {
		// ...
	}
	// Use the user data ...
}
```

### Pages Router

This section is Working in progress :-)
In the meantime, you can see the example in the [Pages Router](./examples/pages-router/) folder.

### Widgets

Widgets are components that allow you to expose management features for tenant-based implementation. In certain scenarios, your customers may require the capability to perform managerial actions independently, alleviating the necessity to contact you. Widgets serve as a feature enabling you to delegate these capabilities to your customers in a modular manner.

Important Note:

- For the user to be able to use the widget, they need to be assigned the `Tenant Admin` Role.

#### User Management

The `UserManagement` widget will let you embed a user table in your site to view and take action.

The widget lets you:

- Create a new user
- Edit an existing user
- Activate / disable an existing user
- Reset an existing user's password
- Remove an existing user's passkey
- Delete an existing user

Note:

- Custom fields also appear in the table.

###### Usage

```js
import { UserManagement } from '@descope/nextjs-sdk';
...
  <UserManagement
    widgetId="user-management-widget"
    tenant="tenant-id"
  />
```

Example:
[Manage Users](./examples/app-router/app/manage-users/page.tsx)

#### Role Management

The `RoleManagement` widget will let you embed a role table in your site to view and take action.

The widget lets you:

- Create a new role
- Change an existing role's fields
- Delete an existing role

Note:

- The `Editable` field is determined by the user's access to the role - meaning that project-level roles are not editable by tenant level users.
- You need to pre-define the permissions that the user can use, which are not editable in the widget.

###### Usage

```js
import { RoleManagement } from '@descope/nextjs-sdk';
...
  <RoleManagement
    widgetId="role-management-widget"
    tenant="tenant-id"
  />
```

Example:
[Manage Roles](./examples/app-router/app/manage-roles/page.tsx)

#### Access Key Management

The `AccessKeyManagement` widget will let you embed an access key table in your site to view and take action.

The widget lets you:

- Create a new access key
- Activate / deactivate an existing access key
- Delete an exising access key

###### Usage

```js
import { AccessKeyManagement } from '@descope/nextjs-sdk';
{
	/* admin view: manage all tenant users' access keys */
}
<AccessKeyManagement
	widgetId="access-key-management-widget"
	tenant="tenant-id"
/>;

{
	/* user view: mange access key for the logged-in tenant's user */
}
<AccessKeyManagement
	widgetId="user-access-key-management-widget"
	tenant="tenant-id"
/>;
```

Example:
[Manage Access Keys](./examples/app-router/app/manage-access-keys/page.tsx)

#### Audit Management

The `AuditManagement` widget will let you embed an audit table in your site.

###### Usage

```js
import { AuditManagement } from '@descope/nextjs-sdk';
...
  <AuditManagement
    widgetId="audit-management-widget"
    tenant="tenant-id"
  />
```

Example:
[Manage Audit](./examples/app-router/app/manage-audit/page.tsx)

#### User Profile

The `UserProfile` widget lets you embed a user profile component in your app and let the logged in user update his profile.

The widget lets you:

- Update user profile picture
- Update user personal information
- Update authentication methods
- Logout

###### Usage

```js
import { UserProfile } from '@descope/nextjs-sdk';
...
  <UserProfile
    widgetId="user-profile-widget"
    onLogout={() => {
      // add here you own logout callback
      window.location.href = '/login';
    }}
  />
```

Example:
[User Profile](./examples/app-router/app/my-user-profile/page.tsx)

#### Applications Portal

The `ApplicationsPortal` lets you embed an applications portal component in your app and allows the logged-in user to open applications they are assigned to.

###### Usage

```js
import { ApplicationsPortal } from '@descope/nextjs-sdk';
...
  <ApplicationsPortal
    widgetId="applications-portal-widget"
  />
```

Example:
[User Profile](./examples/app-router/app/my-applications-portal/page.tsx)

## Code Example

You can find an example react app in the [examples folder](./examples). - [App Router](./examples/app-router/) - [Pages Router](./examples/pages-router/)

## Learn More

To learn more please see the [Descope Documentation and API reference page](https://docs.descope.com/).

## Contact Us

If you need help you can email [Descope Support](mailto:support@descope.com)

## License

The Descope SDK for React is licensed for use under the terms and conditions of the [MIT license Agreement](./LICENSE).
