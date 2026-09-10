/**
 * Entry point of the Preact demo app.
 *
 * Note that this file renders with Preact's own `render` - the SDK below is
 * the unmodified React SDK, resolved to `preact/compat` by the alias in
 * `rollup.config.preact-app.mjs` (the equivalent of `@preact/preset-vite` or a
 * webpack `resolve.alias`).
 */
import { render } from 'preact';
import React from 'react';
import { AuthProvider } from '../../src';
import App from './App';

render(
  <AuthProvider
    projectId={process.env.DESCOPE_PROJECT_ID!}
    baseUrl={process.env.DESCOPE_BASE_URL}
    baseStaticUrl={process.env.DESCOPE_BASE_STATIC_URL}
    baseCdnUrl={process.env.DESCOPE_BASE_CDN_URL}
    refreshCookieName={process.env.DESCOPE_REFRESH_COOKIE_NAME}
  >
    <App />
  </AuthProvider>,
  document.getElementById('root')!,
);
