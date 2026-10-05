// eslint-disable-next-line import/no-extraneous-dependencies
import { createSdk } from '@descope/web-js-sdk';
import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { createRoot } from 'react-dom/client';
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

// A slow mount effect (a heavy app) makes React's scheduler yield after the effects flush
const SlowMountEffect = () => {
  React.useEffect(() => {
    const end = performance.now() + 20;
    while (performance.now() < end) {
      // busy wait
    }
  }, []);
  return null;
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
  // isSessionFetchStarted/isUserFetched are set before the call so the fetch never re-runs.
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

  // A refresh that resolves right away (e.g. no login indicator) on a heavy page clears the
  // loading state before React renders the loading=true update, so both land in one render
  // and useSession never sees isSessionLoading change.
  // Rendered outside act() so React schedules the updates like a browser does - act() would
  // render the loading=true update synchronously and hide the batching
  it('clears isSessionLoading when the initial refresh resolves immediately', async () => {
    const actEnvironment = (globalThis as any).IS_REACT_ACT_ENVIRONMENT;
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = false;
    const container = document.createElement('div');
    const root = createRoot(container);
    try {
      root.render(
        <AuthProvider projectId="p1">
          <SlowMountEffect />
          <SessionProbe />
        </AuthProvider>,
      );

      await waitFor(() => expect(refresh).toHaveBeenCalled());
      await waitFor(() => expect(container.textContent).toBe('false'));
    } finally {
      root.unmount();
      (globalThis as any).IS_REACT_ACT_ENVIRONMENT = actEnvironment;
    }
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
