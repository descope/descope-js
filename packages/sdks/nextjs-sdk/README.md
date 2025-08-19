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

Refer to the [Descope React SDK Section](../react-sdk/README.md) for a list of available props.

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
})

export const config = {
	matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)']
}
```

##### Chaining Next.js Middleware Together

You can chain the Descope Next.js SDK middleware with other middleware functions to apply multiple layers of processing to incoming requests. 

This can help ensure the following things:

- Authentication before applying other middleware logic.
- Allows for a more modular middleware architecture.
- Provides custom handling for different request types.

For example, you can integrate Descope authentication with Next.js internationalization middleware:

```ts
// src/middleware.ts
import { authMiddleware } from '@descope/nextjs-sdk/server';
import createIntlMiddleware from 'next-intl/middleware';

const intlMiddleware = createIntlMiddleware({
  locales: ['en', 'es', 'fr'],
  defaultLocale: 'en'
});

export default async function middleware(req) {
  const authResponse = await authMiddleware({
    publicRoutes: ['/home', '/about'],
    privateRoutes: ['/dashboard', '/profile']
  })(req);

  if (authResponse) return authResponse; // Redirect if authentication fails

  // Run internationalization middleware
  return intlMiddleware(req);
}

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)', '/(api|trpc)(.*)']
};
```

In the code above, we see: 

1. The Descope middleware runs first, ensuring authentication for private routes.
2. If the user is **not authenticated**, they are redirected before proceeding to other middleware.
3. If authentication is successful, the request is passed to the next middleware.
4. Localization middleware processes the request after authentication, setting language preferences.

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
