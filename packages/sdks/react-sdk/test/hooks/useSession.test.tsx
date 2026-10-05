import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { useSession } from '../../src';
import Context from '../../src/hooks/Context';
import { IContext } from '../../src/types';
import { create } from 'domain';

jest.mock('@descope/web-js-sdk', () => ({
  __esModule: true,
  createSdk: jest.fn(),
}));

const renderWithContext = (contextValue: IContext) =>
  renderHook(() => useSession(), {
    // Wrap the hook with the custom context provider
    wrapper: ({ children }: { children?: React.ReactNode }) => (
      <Context.Provider value={contextValue}>{children}</Context.Provider>
    ),
  });

describe('useSession', () => {
  it('should return the proper values when user is already authenticated', () => {
    const fetchSession = jest.fn();
    const session = 'session-token';
    const { result } = renderWithContext({
      session,
      isSessionLoading: false,
      isOidcLoading: false,
      fetchSession,
      isSessionFetched: false,
      isAuthenticated: true,
    } as any as IContext);

    expect(result.current.isSessionLoading).toBe(false);
    expect(result.current.sessionToken).toBe(session);
    expect(result.current.isAuthenticated).toBe(true);
    expect(fetchSession).not.toHaveBeenCalled();
  });

  // On a heavy page the isSessionLoading true/false updates can land in one render,
  // so the context goes straight from "not fetched" to "settled" without ever showing loading
  it('should stop loading when the session settles without ever reporting isSessionLoading', () => {
    let contextValue = {
      isSessionLoading: false,
      isOidcLoading: false,
      fetchSession: jest.fn(),
      isSessionFetched: false,
      isSessionFetchDone: false,
      isAuthenticated: false,
    } as any as IContext;
    const { result, rerender } = renderHook(() => useSession(), {
      wrapper: ({ children }: { children?: React.ReactNode }) => (
        <Context.Provider value={contextValue}>{children}</Context.Provider>
      ),
    });

    expect(result.current.isSessionLoading).toBe(true);

    contextValue = {
      ...contextValue,
      isSessionFetched: true,
      isSessionFetchDone: true,
    };
    rerender();

    expect(result.current.isSessionLoading).toBe(false);
  });
});
