import React from 'react';
/* eslint-disable testing-library/no-node-access */
// eslint-disable-next-line import/no-extraneous-dependencies
import createSdk from '@descope/web-js-sdk';
import { renderHook } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react';
import { AuthProvider, useSession } from '../../src';
import useDescope from '../../src/hooks/useDescope';
import useUser from '../../src/hooks/useUser';

const get = (obj: Record<string, any>, str: string) =>
  str.split('.').reduce((acc, key) => acc[key], obj);

jest.mock('@descope/web-js-sdk', () => {
  const sdk = {
    logout: jest.fn().mockName('logout'),
    logoutAll: jest.fn().mockName('logoutAll'),
    otp: {
      signIn: {
        email: jest.fn().mockName('otp.signIn.email'),
      },
    },
    onSessionTokenChange: jest
      .fn(() => () => {})
      .mockName('onSessionTokenChange'),
    onIsAuthenticatedChange: jest
      .fn(() => () => {})
      .mockName('onIsAuthenticatedChange'),
    onUserChange: jest.fn(() => () => {}).mockName('onUserChange'),
    refresh: jest.fn(() => Promise.resolve()),
    httpClient: {
      hooks: {
        afterRequest: jest.fn(),
      },
    },
    dummyKey: 123,
  };
  return () => sdk;
});

// mock console.error to avoid those errors in tests
jest.spyOn(console, 'error').mockImplementation(() => {});

const { logout, refresh } = createSdk({ projectId: '' });

const authProviderWrapper =
  (projectId: string) =>
  ({ children }: { children: any }) => (
    <AuthProvider projectId={projectId}>{children}</AuthProvider>
  );
describe('hooks', () => {
  it('should throw error when used without provider', () => {
    let result;
    ({ result } = renderHook(useDescope));
    expect(result.error?.message).toEqual(
      'You can only use this hook in the context of <AuthProvider />',
    );

    ({ result } = renderHook(useSession));
    expect(result.error?.message).toEqual(
      'You can only use this hook in the context of <AuthProvider />',
    );

    ({ result } = renderHook(useUser));
    expect(result.error?.message).toEqual(
      'You can only use this hook in the context of <AuthProvider />',
    );
  });

  it.each(['logoutAll', 'logout', 'otp.signIn.email'])(
    'should throw error when using sdk function before sdk initialization - %s',
    (fnName) => {
      const { result } = renderHook(() => useDescope(), {
        wrapper: authProviderWrapper(''),
      });

      expect(get(result.current, fnName)).toThrowError(
        expect.objectContaining({
          message: expect.stringContaining(
            'You can only use this function after sdk initialization',
          ),
        }),
      );
    },
  );

  it('should invoke sdk function when sdk is initialized', () => {
    const { result } = renderHook(() => useDescope(), {
      wrapper: authProviderWrapper('project1'),
    });

    result.current.logout();
    expect(logout).toHaveBeenCalled();
  });

  it('should throw an error when trying to access attribute and sdk is not initialized', () => {
    const { result } = renderHook(() => useDescope(), {
      wrapper: authProviderWrapper(''),
    });

    expect(() => get(result.current, 'dummyKey')).toThrow(
      expect.objectContaining({
        message: expect.stringContaining(
          'You can only use this attribute after sdk initialization',
        ),
      }),
    );
  });

  it('should get default values from provider for useUser', () => {
    const { result } = renderHook(() => useUser(), {
      wrapper: authProviderWrapper('project1'),
    });
    expect(result.current.user).toEqual(undefined);
  });

  it('should get default values from provider for useSession', () => {
    const { result } = renderHook(() => useSession(), {
      wrapper: authProviderWrapper('project1'),
    });
    expect(result.current.isAuthenticated).toEqual(false);
    expect(result.current.sessionToken).toEqual(undefined);
  });

  it('should refresh session only once when useSession rendered twice', async () => {
    const wrapper = authProviderWrapper('project1');

    const { result, rerender } = renderHook(() => useSession(), {
      wrapper,
    });

    expect(result.current.isSessionLoading).toEqual(true);

    await waitFor(() => {
      expect(refresh).toHaveBeenCalled();
    });

    // render again
    rerender();

    expect(result.current.isSessionLoading).toEqual(false);
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
