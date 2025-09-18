// eslint-disable-next-line import/no-extraneous-dependencies
import { createSdk } from '@descope/web-js-sdk';
import { render, waitFor } from '@testing-library/react';
import React, { useCallback } from 'react';
import AuthProvider from '../../src/components/AuthProvider';

jest.mock('@descope/web-js-sdk', () => ({ createSdk: jest.fn(() => {}) }));

describe('AuthProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Should init sdk config with default options', async () => {
    render(
      <AuthProvider projectId="pr1">
        <div>hello</div>
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(createSdk).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'pr1',
          persistTokens: true,
          autoRefresh: true,
        }),
      );
    });
  });
  it('Should init sdk config with customized persist tokens option', async () => {
    render(
      <AuthProvider
        projectId="pr1"
        persistTokens={false}
        storeLastAuthenticatedUser={false}
      >
        <div>hello</div>
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(createSdk).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'pr1',
          persistTokens: false,
          autoRefresh: true,
          storeLastAuthenticatedUser: false,
        }),
      );
    });
  });

  it('Should init sdk config with customized auto refresh option', async () => {
    render(
      <AuthProvider projectId="pr1" autoRefresh={false}>
        <div>hello</div>
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(createSdk).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'pr1',
          persistTokens: true,
          autoRefresh: false,
          storeLastAuthenticatedUser: true,
        }),
      );
    });
  });

  it('Should init sdk config only once with identical seperate instances of object props', async () => {
    const opts = JSON.stringify(`{"secure":"false"}`);

    const { rerender } = render(
      <AuthProvider projectId="pr1" sessionTokenViaCookie={JSON.parse(opts)} />,
    );

    rerender(
      <AuthProvider projectId="pr1" sessionTokenViaCookie={JSON.parse(opts)} />,
    );

    await waitFor(() => {
      expect(createSdk).toHaveBeenCalledTimes(1);
    });
  });

  it('Should init sdk config twice with different prop objects', async () => {
    const { rerender } = render(
      <AuthProvider
        projectId="pr1"
        sessionTokenViaCookie={{ secure: false }}
      />,
    );

    rerender(
      <AuthProvider projectId="pr1" sessionTokenViaCookie={{ secure: true }} />,
    );

    await waitFor(() => {
      expect(createSdk).toHaveBeenCalledTimes(2);
    });
  });

  it('Should init sdk config twice with mutated prop object', async () => {
    const opt = { secure: false };

    const { rerender } = render(
      <AuthProvider projectId="pr1" sessionTokenViaCookie={opt} />,
    );

    opt.secure = true;

    rerender(<AuthProvider projectId="pr1" sessionTokenViaCookie={opt} />);

    await waitFor(() => {
      expect(createSdk).toHaveBeenCalledTimes(2);
    });
  });

  it('Should init sdk config twice when getExternalToken redeclared (wrong usage)', async () => {
    const TestComponent = () => {
      const getExternalToken = async () => 'meow';
      return (
        <AuthProvider projectId="pr1" getExternalToken={getExternalToken} />
      );
    };

    const { rerender } = render(<TestComponent />);

    rerender(<TestComponent />);

    await waitFor(() => {
      expect(createSdk).toHaveBeenCalledTimes(2);
    });
  });

  it('Should init sdk config once when getExternalToken wrapped in useCallback', async () => {
    const TestComponent = () => {
      const getExternalToken = useCallback(async () => 'meow', []);
      return (
        <AuthProvider projectId="pr1" getExternalToken={getExternalToken} />
      );
    };

    const { rerender } = render(<TestComponent />);

    rerender(<TestComponent />);

    await waitFor(() => {
      expect(createSdk).toHaveBeenCalledTimes(1);
    });
  });

  it('Should init sdk config with customized storage prefix option', async () => {
    render(
      <AuthProvider projectId="pr1" storagePrefix="APP_">
        <div>hello</div>
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(createSdk).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'pr1',
          storagePrefix: 'APP_',
        }),
      );
    });
  });
});
