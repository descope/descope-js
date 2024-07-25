# Pages Router Example

This example demonstrates how to use NextJS Descope SDK in an Pages Router.

## Setup

1. Build the sdk package:

```bash
(cd ../../ && npm run build)
```

2. Install dependencies:

```bash
npm install
```

3. Set environment variables using the `.env` file:

```bash
NEXT_PUBLIC_DESCOPE_PROJECT_ID=<Your Descope Project-ID>
NEXT_PUBLIC_DESCOPE_FLOW_ID=<Your Descope Flow-ID>
DESCOPE_MANAGEMENT_KEY=<Your Descope Management Key> # Default is sign-up-or-in
# This is an example of a custom route for the sign-in page
# the /login route is the one that this example uses
SIGN_IN_ROUTE="/login"
```

## Run the example

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) with your browser to see the result.

## Usage

This app has the following parts

- Layout `pages/_app.tsx` - a layout that wraps the app layout with the Auth Provider
- Home page `pages/index.tsx` - a component that renders another Component (`UserDetails`) that uses Descope client hooks
- Login page `pages/login.tsx` - a Component that renders Descope Flow Component
- Authentication middleware `src/middleware.ts` - a middleware that checks if the user is authenticated and redirects to the login page if not
- Route handler `src/pages/api/index.ts` - a route handler that returns the user's details using the Descope Management SDK. use `curl -H "Authorization: Bearer <Descope-Session-Token>" http://localhost:3001/api` to test it
