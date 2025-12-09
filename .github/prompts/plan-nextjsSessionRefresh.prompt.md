# Plan: Enable Session Refresh in Next.js Middleware

This plan addresses the gap where Next.js middleware cannot refresh expired sessions because the refresh token is not available server-side, while the client-only `useSession` hook handles refresh.

## Problem Statement

Currently, the client-side session management happens only in the client when the user calls `useSession`. The problem is that the middleware may run when the session is expired, but the refresh has not occurred yet. The middleware validates the JWT, finds it expired, and redirects to sign-in, even though a valid refresh token exists that could renew the session.

For server-side refresh to work:

1. The refresh cookie needs to be available in the middleware
2. Descope may send the refresh token in the response body, so we need to add a `refreshTokenViaCookie` option (similar to `sessionTokenViaCookie`) and turn it on by default in Next.js AuthProvider
3. If Descope does refresh token rotation, the middleware refresh may return a new refresh cookie, and this cookie needs to be communicated to the frontend somehow

## Steps

### 1. Add `refreshTokenViaCookie` option to Next.js `AuthProvider`

**File:** `packages/sdks/nextjs-sdk/src/shared/AuthProvider.tsx`

Extend the AuthProvider to accept and default `refreshTokenViaCookie` to `true` (similar to how `sessionTokenViaCookie` defaults to `{ sameSite: 'Lax' }`), passing this to the React SDK's `AuthProvider`.

**Changes:**

- Add `refreshTokenViaCookie` prop that defaults to `{ sameSite: 'Lax', httpOnly: true }`
- Pass this prop to the underlying React SDK `AuthProvider`
- Update the default to enable cookie-based refresh token storage for SSR compatibility

### 2. Enable refresh token cookie persistence in web-js-sdk

**File:** `packages/sdks/web-js-sdk/src/enhancers/withPersistTokens/helpers.ts`

Update the `persistTokens` function to accept a `refreshTokenViaCookie` parameter and store the refresh token in a cookie (with configurable name, defaulting to `DSR`) when enabled, similar to how session tokens are stored via cookie.

**Changes:**

- Add `refreshTokenViaCookie` parameter to `persistTokens` function signature
- When `refreshTokenViaCookie` is truthy, store refresh token in cookie instead of localStorage
- Support cookie configuration: `{ httpOnly?, secure?, sameSite?, cookieName?, domain? }`
- Default cookie name should be `DSR` (matching `REFRESH_TOKEN_KEY` constant)
- Ensure `httpOnly: true` for security (refresh tokens should not be accessible via JavaScript)

**File:** `packages/sdks/web-js-sdk/src/enhancers/withPersistTokens/types.ts`

Add `refreshTokenViaCookie` option type definition.

**Changes:**

- Add `refreshTokenViaCookie` to `PersistTokensOptions` type
- Define type similar to `sessionTokenViaCookie`: `boolean | CookieConfig`

**File:** `packages/sdks/web-js-sdk/src/enhancers/withPersistTokens/index.ts`

Update the `withPersistTokens` enhancer to pass `refreshTokenViaCookie` to helper functions.

**Changes:**

- Extract `refreshTokenViaCookie` from config
- Pass it to `persistTokens` and `clearTokens` functions
- Update the afterRequest hook to handle refresh token cookies

### 3. Add refresh capability to Next.js middleware

**File:** `packages/sdks/nextjs-sdk/src/server/authMiddleware.ts`

Modify the middleware to call `sdk.refresh()` when `validateJwt` fails with expired session, checking for refresh token in cookies (configurable via `refreshCookieName` option matching the client).

**Changes:**

- Add `refreshCookieName` to `MiddlewareOptions` type (defaults to `DSR`)
- When JWT validation fails, check if refresh token cookie exists
- If refresh token exists, attempt to call `sdk.refresh(refreshToken)`
- If refresh succeeds, extract new session from response and add to headers
- If refresh also fails (expired refresh token), proceed with redirect to sign-in

### 4. Handle refresh token rotation in middleware

When middleware calls `sdk.refresh()`, extract the new refresh token from the response (if Descope returns one due to rotation) and set it as a cookie in the `NextResponse` before returning, ensuring the client receives the rotated token.

**Changes:**

- After successful refresh in middleware, check if response contains new `refreshJwt`
- If new refresh token exists (rotation scenario), set it as a cookie in the response
- Use same cookie configuration (httpOnly, secure, sameSite, domain) as defined in options
- Ensure cookie is set on the `NextResponse` object that's being returned

### 5. Update type definitions and options

**File:** `packages/sdks/web-js-sdk/src/enhancers/withPersistTokens/types.ts`

Add `refreshTokenViaCookie` option types.

**Changes:**

- Add to `PersistTokensOptions<A>` interface
- Type should be `boolean | CookieConfig` similar to `sessionTokenViaCookie`

**File:** `packages/sdks/nextjs-sdk/src/server/authMiddleware.ts`

Update `MiddlewareOptions` to include `refreshCookieName`.

**Changes:**

- Add `refreshCookieName?: string` to `MiddlewareOptions` type
- Add JSDoc comment explaining it should match the client-side cookie name
- Default value should be `'DSR'` (matching the default `REFRESH_TOKEN_KEY`)

### 6. Add server-side session helper utilities

**File:** `packages/sdks/nextjs-sdk/src/server/session.ts`

Extend to export `refreshSession` function that attempts refresh using cookie-stored refresh token and returns updated `AuthenticationInfo`, usable in server components and route handlers.

**Changes:**

- Add `refreshSession` function that:
  - Reads refresh token from cookies (using configurable name)
  - Calls `sdk.refresh(refreshToken)`
  - Returns `AuthenticationInfo` or `undefined` if refresh fails
- Add `refreshCookieName` parameter to `SessionConfig` type
- Update JSDoc to document the new function

## Further Considerations

### 1. Cookie security and configuration

**Question:** Should refresh token cookies use `HttpOnly`, `Secure`, and `SameSite` attributes?

**Recommendation:**

- `HttpOnly: true` - Prevents client-side JavaScript access (critical for security)
- `Secure: true` - Only send over HTTPS
- `SameSite: 'Lax'` - Balance between security and usability
- Support customization via `refreshTokenViaCookie: { httpOnly?, secure?, sameSite?, cookieName?, domain? }`

**Note:** Unlike session tokens, refresh tokens should ALWAYS be `httpOnly: true` and not configurable, as they are more sensitive and should never be accessible via JavaScript.

### 2. Backward compatibility

**Question:** Since refresh tokens are currently localStorage-only, should we default `refreshTokenViaCookie: false` to avoid breaking changes, or default to `true` only in Next.js SDK?

**Recommendation:**

- In `web-js-sdk`: Default `refreshTokenViaCookie: false` to maintain backward compatibility
- In `nextjs-sdk`: Default `refreshTokenViaCookie: true` for better SSR support
- Document the difference clearly in migration guides
- Provide clear upgrade path for users who want SSR refresh capability

**Migration impact:**

- Existing Next.js apps will need to clear localStorage-stored refresh tokens on first load after upgrade
- Can be handled automatically by checking for both and migrating from localStorage to cookie

### 3. Testing requirements

Need comprehensive tests for:

1. **Middleware refresh flow with rotation** (`authMiddleware.test.ts`)

   - Test successful refresh when session expired but refresh token valid
   - Test refresh token rotation scenario (new refresh token returned)
   - Test expired refresh token handling (redirect to sign-in)
   - Test missing refresh token handling

2. **Cookie persistence/retrieval** (new test file or `persistTokens.test.ts`)

   - Test refresh token stored in cookie when `refreshTokenViaCookie: true`
   - Test cookie attributes (httpOnly, secure, sameSite)
   - Test custom cookie name configuration
   - Test cookie removal on logout

3. **Server-side refresh utility** (`session.test.ts`)

   - Test `refreshSession` with valid refresh token
   - Test `refreshSession` with expired refresh token
   - Test `refreshSession` with missing refresh token
   - Test token rotation handling

4. **Client-side compatibility**
   - Ensure client-side refresh continues to work with cookie-based refresh tokens
   - Test `useSession` hook behavior with server-side refresh
   - Test cross-tab synchronization with cookie-based tokens

Focus test coverage on `authMiddleware.test.ts` and new `refreshSession` server utility.

## Implementation Order

1. Start with web-js-sdk changes (types and helpers) - foundation
2. Update Next.js AuthProvider to enable refresh token cookies
3. Add middleware refresh capability
4. Add server-side utilities
5. Add comprehensive tests
6. Update documentation and examples

## Edge Cases to Consider

1. **Race conditions:** Client and server both attempting refresh simultaneously
2. **Token rotation:** Ensuring rotated tokens propagate correctly from server to client
3. **Multi-tab scenarios:** Multiple tabs with same user session
4. **Cookie size limits:** Refresh tokens can be large, ensure they fit in cookie limits
5. **Domain/subdomain issues:** Cookie domain configuration for apps using subdomains
6. **Development vs production:** Handling secure cookies in local development (http vs https)
