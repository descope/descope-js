/* eslint-disable testing-library/no-node-access */
// eslint-disable-next-line import/no-extraneous-dependencies
import createSdk from '@descope/web-js-sdk';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import App from '../../examples/app/App';
import { AuthProvider, useSession, useUser } from '../../src';

Object.defineProperty(global, 'Response', {
  value: class {},
  configurable: true,
  writable: true,
});

jest.mock('@descope/web-component', () => ({ default: {} }));
jest.mock('@descope/user-management-widget', () => ({ default: {} }));

jest.mock('@descope/web-js-sdk', () => {
  const sdk = {
    logout: jest.fn().mockName('logout'),
    onSessionTokenChange: jest.fn().mockName('onSessionTokenChange'),
    onIsAuthenticatedChange: jest.fn().mockName('onIsAuthenticatedChange'),
    onUserChange: jest.fn().mockName('onUserChange'),
    onClaimsChange: jest.fn().mockName('onClaimsChange'),
    getSessionToken: jest.fn().mockName('getSessionToken'),
    getJwtRoles: jest.fn().mockName('getJwtRoles'),
    refresh: jest.fn(() => Promise.resolve()),
    me: jest.fn(() => Promise.resolve()),
    httpClient: {
      hooks: {
        afterRequest: jest.fn(),
      },
    },
  };
  return () => sdk;
});

const renderWithRouter = (ui: React.ReactElement) =>
  render(<MemoryRouter>{ui}</MemoryRouter>);

const {
  logout,
  onSessionTokenChange,
  onIsAuthenticatedChange,
  onUserChange,
  onClaimsChange,
  refresh,
  me,
} = createSdk({
  projectId: '',
});

describe('App', () => {
  beforeEach(() => {
    // reset mock functions that may be override
    (onSessionTokenChange as jest.Mock).mockImplementation(() => () => {});
    (onIsAuthenticatedChange as jest.Mock).mockImplementation(() => () => {});
    (onUserChange as jest.Mock).mockImplementation(() => () => {});
    (onClaimsChange as jest.Mock).mockImplementation(() => () => {});
  });

  it('should subscribe to user and session token', async () => {
    (onIsAuthenticatedChange as jest.Mock).mockImplementation((cb) => {
      expect(cb).toBeTruthy();
      cb(true);
      return () => {};
    });

    (onUserChange as jest.Mock).mockImplementation((cb) => {
      expect(cb).toBeTruthy();
      cb({ name: 'user1' });
      return () => {};
    });
    renderWithRouter(
      <AuthProvider projectId="p1">
        <App />
      </AuthProvider>,
    );

    expect(onSessionTokenChange).toBeCalled();
    expect(onUserChange).toBeCalled();

    // ensure user details are shown
    await screen.findByText(/user1/);
  });

  it('should show error message on error', async () => {
    const { container } = renderWithRouter(
      <AuthProvider projectId="p1">
        <App />
      </AuthProvider>,
    );
    const loginButton = await screen.findByText('Login');
    fireEvent.click(loginButton);

    await waitFor(() =>
      // eslint-disable-next-line testing-library/no-container
      expect(container.querySelector('descope-wc')).toBeInTheDocument(),
    );

    // mock error
    fireEvent(
      // eslint-disable-next-line testing-library/no-container
      container.querySelector('descope-wc'),
      new CustomEvent('error', {}),
    );

    // ensure error is shown
    const error = document.querySelector('.error');
    expect(error).not.toBeNull();
  });

  it('should render logout button and and call sdk logout', async () => {
    (onIsAuthenticatedChange as jest.Mock).mockImplementation((cb) => {
      cb(true);
      return () => {};
    });
    (onUserChange as jest.Mock).mockImplementation((cb) => {
      cb({ name: 'user1' });
      return () => {};
    });
    renderWithRouter(
      <AuthProvider projectId="p1">
        <App />
      </AuthProvider>,
    );

    // logout
    await screen.findByText('Logout');
    fireEvent.click(screen.getByText('Logout'));

    // ensure logout called
    expect(logout).toBeCalled();
  });

  it('should call refresh only once when useSession used twice', async () => {
    // rendering App twice which uses useSession
    renderWithRouter(
      <AuthProvider projectId="p1">
        <>
          <App />
          <App />
        </>
      </AuthProvider>,
    );

    // ensure refresh called only once
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('should call me only once when useUser used twice', async () => {
    // rendering App twice which uses useUser
    (onIsAuthenticatedChange as jest.Mock).mockImplementation((cb) => {
      cb(true);
      return () => {};
    });

    const MyComponent = () => {
      // Calling useSession to trigger onIsAuthenticated (because having a session token is required to fetch user)
      useSession();
      // Using useUser to fetch user
      useUser();
      return <div>MyComponent</div>;
    };

    renderWithRouter(
      <AuthProvider projectId="p1">
        <>
          <MyComponent />
          <MyComponent />
        </>
      </AuthProvider>,
    );

    // ensure me called only once
    expect(me).toHaveBeenCalledTimes(1);
  });

  it('should trigger refresh once when navigating between pages', async () => {
    const { container } = renderWithRouter(
      <AuthProvider projectId="p1">
        <App />
      </AuthProvider>,
    );

    // ensure refresh called only once
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledWith(undefined, true); // the second argument (tryRefresh) should be true

    const loginButton = await screen.findByText('Login');
    fireEvent.click(loginButton);

    await waitFor(() =>
      // eslint-disable-next-line testing-library/no-container
      expect(container.querySelector('descope-wc')).toBeInTheDocument(),
    );

    // ensure refresh called only once
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
