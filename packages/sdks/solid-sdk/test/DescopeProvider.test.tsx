import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@solidjs/testing-library';
import { DescopeProvider } from '../src/DescopeProvider';
import { useSession, useUser, useDescope } from '../src/hooks';

vi.mock('../src/sdk', () => ({
  default: vi.fn(() => ({
    onSessionTokenChange: vi.fn(() => vi.fn()),
    onUserChange: vi.fn(() => vi.fn()),
    onIsAuthenticatedChange: vi.fn(() => vi.fn()),
    onClaimsChange: vi.fn(() => vi.fn()),
    refresh: vi.fn().mockResolvedValue({}),
    me: vi.fn().mockResolvedValue({}),
    httpClient: {
      hooks: {
        beforeRequest: vi.fn(),
        afterRequest: vi.fn(),
      },
    },
    oidc: {
      finishLoginIfNeed: vi.fn().mockResolvedValue({}),
    },
  })),
  setGlobalSdk: vi.fn(),
  getGlobalSdk: vi.fn(),
  getSessionToken: vi.fn(),
  getRefreshToken: vi.fn(),
  refresh: vi.fn(),
  isSessionTokenExpired: vi.fn(),
  isRefreshTokenExpired: vi.fn(),
  getJwtRoles: vi.fn(),
  getJwtPermissions: vi.fn(),
  getCurrentTenant: vi.fn(),
}));

describe('DescopeProvider', () => {
  it('provides auth context to children', () => {
    function TestComponent() {
      const sdk = useDescope();
      return <div>SDK Available: {sdk ? 'Yes' : 'No'}</div>;
    }

    render(() => (
      <DescopeProvider projectId="test-project">
        <TestComponent />
      </DescopeProvider>
    ));

    expect(screen.getByText(/SDK Available: Yes/)).toBeDefined();
  });

  it('throws error when hooks used outside provider', () => {
    function TestComponent() {
      try {
        useDescope();
        return <div>No Error</div>;
      } catch (e) {
        return <div>Error: {(e as Error).message}</div>;
      }
    }

    render(() => <TestComponent />);

    expect(
      screen.getByText(/useDescope must be used within a DescopeProvider/),
    ).toBeDefined();
  });
});

describe('useSession', () => {
  it('provides session state', () => {
    function TestComponent() {
      const { isAuthenticated } = useSession();
      return <div>Authenticated: {isAuthenticated() ? 'Yes' : 'No'}</div>;
    }

    render(() => (
      <DescopeProvider projectId="test-project">
        <TestComponent />
      </DescopeProvider>
    ));

    expect(screen.getByText(/Authenticated: No/)).toBeDefined();
  });
});

describe('useUser', () => {
  it('provides user state', () => {
    function TestComponent() {
      const { user } = useUser();
      return <div>User: {user() ? 'Loaded' : 'None'}</div>;
    }

    render(() => (
      <DescopeProvider projectId="test-project">
        <TestComponent />
      </DescopeProvider>
    ));

    expect(screen.getByText(/User: None/)).toBeDefined();
  });
});
