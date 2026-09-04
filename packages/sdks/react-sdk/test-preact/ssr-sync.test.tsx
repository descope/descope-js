/**
 * @jest-environment node
 *
 * Kept in its own file so the module registry - and therefore `lazy()` - is
 * still unresolved, which is the state every server process starts in.
 *
 * Unlike React's `renderToString`, preact-render-to-string's *sync* renderer
 * refuses to render a suspended subtree rather than emitting the fallback.
 * Pinned here so the README's "use renderToStringAsync" note stays honest.
 */
import React from 'react';
import { renderToString } from 'preact-render-to-string';
import { AuthProvider, Descope } from '../src';

jest.mock('@descope/web-component', () => ({ default: {} }));
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

it('rejects the sync renderer on a not-yet-resolved lazy subtree', () => {
  expect(() =>
    renderToString(
      <AuthProvider projectId="p1">
        <Descope flowId="sign-up-or-in" />
      </AuthProvider>,
    ),
  ).toThrow(/renderToStringAsync/);
});
