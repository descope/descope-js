// eslint-disable-next-line import/no-extraneous-dependencies
import { createSdk } from '@descope/web-js-sdk';
import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { AuthProvider, useSession, useUser } from '../../src';

jest.mock('@descope/web-js-sdk', () => {
  const sdk = {
    onSessionTokenChange: jest.fn(() => () => {}),
    onIsAuthenticatedChange: jest.fn(() => () => {}),
    onUserChange: jest.fn(() => () => {}),
    onClaimsChange: jest.fn(() => () => {}),
    refresh: jest.fn(() => Promise.resolve()),
    me: jest.fn(() => Promise.resolve()),
  };
  return { createSdk: () => sdk };
});

const { onIsAuthenticatedChange, refresh, me } = createSdk({ projectId: '' });

const SessionProbe = () => {
  const { isSessionLoading } = useSession();
  return <div data-testid="session-loading">{String(isSessionLoading)}</div>;
};

const UserProbe = () => {
  const { isUserLoading } = useUser();
  return <div data-testid="user-loading">{String(isUserLoading)}</div>;
};

describe('AuthProvider loading state on a rejected refresh / me', () => {
  beforeEach(() => {
    (onIsAuthenticatedChange as jest.Mock).mockImplementation(() => () => {});
    (refresh as jest.Mock).mockImplementation(() => Promise.resolve());
    (me as jest.Mock).mockImplementation(() => Promise.resolve());
  });

  // Without a rejection handler the loading state stays `true` forever, since
  // isSessionFetched/isUserFetched are set before the call so the fetch never re-runs.
  it('clears isSessionLoading when the initial refresh rejects', async () => {
    (refresh as jest.Mock).mockRejectedValueOnce(new Error('network error'));

    const { getByTestId } = render(
      <AuthProvider projectId="p1">
        <SessionProbe />
      </AuthProvider>,
    );

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    await waitFor(() =>
      expect(getByTestId('session-loading').textContent).toBe('false'),
    );
  });

  it('clears isUserLoading when me rejects', async () => {
    (onIsAuthenticatedChange as jest.Mock).mockImplementation((cb) => {
      cb(true);
      return () => {};
    });
    (me as jest.Mock).mockRejectedValueOnce(new Error('network error'));

    const { getByTestId } = render(
      <AuthProvider projectId="p1">
        <UserProbe />
      </AuthProvider>,
    );

    await waitFor(() => expect(me).toHaveBeenCalled());
    await waitFor(() =>
      expect(getByTestId('user-loading').textContent).toBe('false'),
    );
  });
});
