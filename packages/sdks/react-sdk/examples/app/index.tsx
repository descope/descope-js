import React from 'react';
// eslint-disable-next-line import/no-extraneous-dependencies
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../src';
import App from './App';

const container = document.getElementById('root');
const root = createRoot(container!);

root.render(
  <BrowserRouter>
    <AuthProvider
      projectId={process.env.DESCOPE_PROJECT_ID!}
      oidcConfig={
        process.env.DESCOPE_OIDC_ENABLED === 'true'
          ? {
              authority: process.env.DESCOPE_OIDC_AUTHORITY,
            }
          : undefined
      }
      baseUrl={process.env.DESCOPE_BASE_URL}
      baseStaticUrl={process.env.DESCOPE_BASE_STATIC_URL}
      refreshCookieName={process.env.DESCOPE_REFRESH_COOKIE_NAME}
    >
      <App />
    </AuthProvider>
  </BrowserRouter>,
);
