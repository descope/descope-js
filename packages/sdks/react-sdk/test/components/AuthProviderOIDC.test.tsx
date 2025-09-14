import { render, waitFor } from '@testing-library/react';
import React from 'react';
import AuthProvider from '../../src/components/AuthProvider';

const mockFinishLogin = jest.fn(() => Promise.resolve());
const mockHasOidcParamsInUrl = jest.fn(() => false);
jest.mock('@descope/web-js-sdk', () => ({
  __esModule: true,
  createSdk: jest.fn(() => ({
    oidc: { finishLoginIfNeed: () => mockFinishLogin() },
    onSessionTokenChange: jest.fn(() => jest.fn()),
    onUserChange: jest.fn(() => jest.fn()),
    onClaimsChange: jest.fn(() => jest.fn()),
    onIsAuthenticatedChange: jest.fn(() => jest.fn()),
    refresh: jest.fn(() => Promise.resolve()),
    me: jest.fn(() => Promise.resolve()),
  })),
  hasOidcParamsInUrl: () => mockHasOidcParamsInUrl(),
}));

describe('AuthProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Should trigger oidc finish login', async () => {
    mockHasOidcParamsInUrl.mockReturnValue(true);
    render(
      <AuthProvider projectId="pr1" oidcConfig>
        <div>hello</div>
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(require('@descope/web-js-sdk').createSdk).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'pr1',
          oidcConfig: true,
        }),
      );
    });

    await waitFor(() => {
      expect(mockFinishLogin).toHaveBeenCalled();
    });
  });

  it('Should not trigger oidc finish login oidc is not enabled', async () => {
    mockHasOidcParamsInUrl.mockReturnValue(false);
    render(
      <AuthProvider projectId="pr1" oidcConfig={false}>
        <div>hello</div>
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(require('@descope/web-js-sdk').createSdk).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'pr1',
          oidcConfig: false,
        }),
      );
    });

    expect(mockFinishLogin).not.toHaveBeenCalled();
  });
});
