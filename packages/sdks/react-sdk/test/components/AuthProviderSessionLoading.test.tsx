// eslint-disable-next-line import/no-extraneous-dependencies
import { createSdk } from '@descope/web-js-sdk';
import { act, render, waitFor } from '@testing-library/react';
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

  // Regression for #1393 - when refresh() short-circuits synchronously the
  // isSessionLoading clear must land in a separate macrotask, so consumers
  // always observe the true→false transition instead of both updates being
  // batched into a single render
  it('defers the isSessionLoading clear to a separate macrotask', async () => {
    jest.useFakeTimers();
    try {
      const { getByTestId } = render(
        <AuthProvider projectId="p1">
          <SessionProbe />
        </AuthProvider>,
      );

      // let refresh() resolve and its microtask handlers run - the clear must
      // not have landed yet, consumers still see the loading state
      await act(async () => {
        await Promise.resolve();
      });
      expect(refresh).toHaveBeenCalled();
      expect(getByTestId('session-loading').textContent).toBe('true');

      // the deferred clear fires from a timer
      await act(async () => {
        jest.runAllTimers();
      });
      expect(getByTestId('session-loading').textContent).toBe('false');
    } finally {
      jest.useRealTimers();
    }
  });

  // Regression for #1433 - the loading clear must not depend on
  // requestAnimationFrame, which never fires while the tab is backgrounded
  // (e.g. a login page opened from an email magic link)
  it('clears isSessionLoading even when requestAnimationFrame never fires', async () => {
    const rafSpy = jest
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation(() => 1); // backgrounded tab: callback never runs

    try {
      const { getByTestId } = render(
        <AuthProvider projectId="p1">
          <SessionProbe />
        </AuthProvider>,
      );

      await waitFor(() => expect(refresh).toHaveBeenCalled());
      await waitFor(() =>
        expect(getByTestId('session-loading').textContent).toBe('false'),
      );
    } finally {
      rafSpy.mockRestore();
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
