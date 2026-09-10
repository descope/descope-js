/**
 * @jest-environment node
 *
 * `<Descope />` and the widgets lazy-load their web component because that
 * code touches browser APIs. This asserts a Preact SSR app can render the SDK
 * without a DOM. See `ssr-sync.test.tsx` for why the async renderer is the one
 * a Preact server has to use.
 */
import React from 'react';
import { renderToString, renderToStringAsync } from 'preact-render-to-string';
import { AuthProvider, Descope, UserProfile } from '../src';

jest.mock('@descope/web-component', () => ({ default: {} }));
jest.mock('@descope/user-profile-widget', () => ({ default: {} }));

jest.mock('@descope/web-js-sdk', () => ({
  createSdk: () => ({
    onSessionTokenChange: jest.fn(() => () => {}),
    onIsAuthenticatedChange: jest.fn(() => () => {}),
    onUserChange: jest.fn(() => () => {}),
    onClaimsChange: jest.fn(() => () => {}),
    refresh: jest.fn(() => Promise.resolve()),
    me: jest.fn(() => Promise.resolve()),
    httpClient: {
      hooks: { afterRequest: jest.fn(), beforeRequest: jest.fn() },
    },
  }),
}));

describe('server-side rendering with preact-render-to-string', () => {
  it('renders <AuthProvider /> children without a DOM', () => {
    expect(typeof document).toBe('undefined');

    const html = renderToString(
      <AuthProvider projectId="p1">
        <p>hello</p>
      </AuthProvider>,
    );

    expect(html).toBe('<p>hello</p>');
  });

  it('resolves the lazy flow with renderToStringAsync', async () => {
    const html = await renderToStringAsync(
      <AuthProvider projectId="p1">
        <Descope flowId="sign-up-or-in" />
      </AuthProvider>,
    );

    expect(html).toContain('<descope-wc');
    expect(html).toContain('flow-id="sign-up-or-in"');
  });

  it('resolves a lazy widget with renderToStringAsync', async () => {
    const html = await renderToStringAsync(
      <AuthProvider projectId="p1">
        <UserProfile widgetId="w1" />
      </AuthProvider>,
    );

    expect(html).toContain('<descope-user-profile-widget');
    expect(html).toContain('widget-id="w1"');
  });
});
