/**
 * Preact-only assertions. The shared `test/` suite already runs against
 * `preact/compat` (see `jest.preact.config.js`); this file covers the parts
 * that are meaningless under React - that the alias is actually in effect, and
 * that the custom-element bridge behaves identically once it is.
 */
import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import {
  AccessKeyManagement,
  ApplicationsPortal,
  AuditManagement,
  AuthProvider,
  Descope,
  OutboundApplications,
  RoleManagement,
  SignInFlow,
  SignUpFlow,
  SignUpOrInFlow,
  TenantProfile,
  UserManagement,
  UserProfile,
  useDescope,
  useSession,
  useUser,
} from '../src';
import { findWcWithListener } from '../testUtils/wcListeners';

Object.defineProperty(global, 'Response', {
  value: class {},
  configurable: true,
  writable: true,
});

jest.mock('@descope/web-component', () => ({ default: {} }));
jest.mock('@descope/user-management-widget', () => ({ default: {} }));
jest.mock('@descope/user-profile-widget', () => ({ default: {} }));
jest.mock('@descope/role-management-widget', () => ({ default: {} }));
jest.mock('@descope/access-key-management-widget', () => ({ default: {} }));
jest.mock('@descope/audit-management-widget', () => ({ default: {} }));
jest.mock('@descope/applications-portal-widget', () => ({ default: {} }));
jest.mock('@descope/outbound-applications-widget', () => ({ default: {} }));
jest.mock('@descope/tenant-profile-widget', () => ({ default: {} }));

const afterRequest = jest.fn();
jest.mock('@descope/web-js-sdk', () => {
  const sdk = {
    logout: jest.fn(),
    onSessionTokenChange: jest.fn(() => () => {}),
    onIsAuthenticatedChange: jest.fn(() => () => {}),
    onUserChange: jest.fn(() => () => {}),
    onClaimsChange: jest.fn(() => () => {}),
    refresh: jest.fn(() => Promise.resolve()),
    me: jest.fn(() => Promise.resolve()),
    httpClient: {
      hooks: {
        // eslint-disable-next-line global-require
        afterRequest: (...args: any[]) =>
          // eslint-disable-next-line no-use-before-define
          (global as any).__afterRequest(...args),
        beforeRequest: jest.fn(),
      },
    },
  };
  return { createSdk: () => sdk };
});
(global as any).__afterRequest = afterRequest;

const withProvider = (ui: React.ReactNode) => (
  <AuthProvider projectId="p1">{ui}</AuthProvider>
);

// Attributes and properties are applied from the ref callback, which runs
// before effects, so mounting is all these need to wait for.
const findWc = async (container: HTMLElement, tag = 'descope-wc') => {
  await waitFor(() => expect(container.querySelector(tag)).toBeTruthy());
  return container.querySelector(tag) as HTMLElement;
};

// Event tests need more: `<Descope />` attaches its listeners from a
// `useEffect`, which Preact runs after paint, and an event dispatched before
// then is lost rather than deferred. `success` is the one listener it always
// registers, so its attachment marks the whole effect as having run.
const findFlowWc = (container: HTMLElement) =>
  findWcWithListener(container, 'descope-wc', 'success');

describe('preact/compat aliasing', () => {
  it('resolves `react` to preact/compat, not React', () => {
    // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
    expect(require('react')).toBe(require('preact/compat'));
    // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
    expect(require('react-dom')).toBe(require('preact/compat'));
    // Preact reports its own version, React would report `18.x` here.
    // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
    expect(require('preact').options).toBeDefined();
  });
});

describe('custom element bridge under preact/compat', () => {
  it('maps `.attr` props to kebab-case attributes', async () => {
    const { container } = render(
      withProvider(<Descope flowId="f" theme="dark" locale="en" debug />),
    );
    const wc = await findWc(container);

    expect(wc.getAttribute('theme')).toBe('dark');
    expect(wc.getAttribute('locale')).toBe('en');
    expect(wc.getAttribute('debug')).toBe('true');
  });

  it('serialises non-string `.attr` values instead of "[object Object]"', async () => {
    const { container } = render(
      withProvider(<Descope flowId="f" client={{ version: '1.2.3' }} />),
    );
    const wc = await findWc(container);

    expect(JSON.parse(wc.getAttribute('client'))).toEqual({
      version: '1.2.3',
    });
  });

  it('sets `.prop` props as element properties, not attributes', async () => {
    const errorTransformer = jest.fn();
    const { container } = render(
      withProvider(<Descope flowId="f" errorTransformer={errorTransformer} />),
    );
    const wc = await findWc(container);

    expect((wc as any).errorTransformer).toBe(errorTransformer);
    expect(wc.hasAttribute('errorTransformer')).toBe(false);
    expect(wc.hasAttribute('error-transformer')).toBe(false);
  });

  it('removes an attribute when its value becomes nullish', async () => {
    const { container, rerender } = render(
      withProvider(<Descope flowId="f" theme="dark" />),
    );
    const wc = await findWc(container);
    expect(wc.getAttribute('theme')).toBe('dark');

    rerender(withProvider(<Descope flowId="f" theme={undefined} />));
    await waitFor(() =>
      expect(container.querySelector('descope-wc').hasAttribute('theme')).toBe(
        false,
      ),
    );
  });

  it('exposes the web component through the forwarded ref', async () => {
    const ref = React.createRef<HTMLElement>();
    const { container } = render(
      withProvider(<Descope ref={ref} flowId="f" />),
    );
    await findWc(container);

    await waitFor(() => expect(ref.current).toBeTruthy());
    expect(ref.current.tagName).toBe('DESCOPE-WC');
  });
});

describe('custom events under preact/compat', () => {
  it('forwards `error` and `ready` to their callbacks', async () => {
    const onError = jest.fn();
    const onReady = jest.fn();
    const { container } = render(
      withProvider(<Descope flowId="f" onError={onError} onReady={onReady} />),
    );
    const wc = await findFlowWc(container);

    fireEvent(wc, new CustomEvent('error', { detail: { a: 1 } }));
    fireEvent(wc, new CustomEvent('ready', {}));

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onReady).toHaveBeenCalledTimes(1);
  });

  it('runs the SDK afterRequest hook before calling `onSuccess`', async () => {
    const onSuccess = jest.fn();
    const { container } = render(
      withProvider(<Descope flowId="f" onSuccess={onSuccess} />),
    );
    const wc = await findFlowWc(container);

    fireEvent(wc, new CustomEvent('success', { detail: { sessionJwt: 'x' } }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(afterRequest).toHaveBeenCalled();
  });

  it('detaches listeners on unmount', async () => {
    const onError = jest.fn();
    const { container, unmount } = render(
      withProvider(<Descope flowId="f" onError={onError} />),
    );
    const wc = await findFlowWc(container);
    unmount();

    fireEvent(wc, new CustomEvent('error', {}));
    expect(onError).not.toHaveBeenCalled();
  });
});

describe('hooks under preact/compat', () => {
  it('throws outside of <AuthProvider />', () => {
    const Boom = () => {
      useSession();
      return null;
    };
    // Preact surfaces the throw through its own error boundary path; assert
    // the component cannot render rather than matching on React's message.
    expect(() => render(<Boom />)).toThrow(
      /You can only use this hook in the context of <AuthProvider \/>/,
    );
  });

  it('provides session, user and sdk from context', async () => {
    const seen: Record<string, any> = {};
    const Probe = () => {
      const session = useSession();
      const user = useUser();
      seen.sdk = useDescope();
      seen.isAuthenticated = session.isAuthenticated;
      seen.user = user.user;
      return null;
    };

    render(withProvider(<Probe />));

    await waitFor(() => expect(seen.sdk).toBeTruthy());
    expect(typeof seen.sdk.logout).toBe('function');
    expect(seen.isAuthenticated).toBe(false);
  });
});

describe('widgets under preact/compat', () => {
  it.each([
    ['descope-user-management-widget', UserManagement],
    ['descope-role-management-widget', RoleManagement],
    ['descope-access-key-management-widget', AccessKeyManagement],
    ['descope-audit-management-widget', AuditManagement],
    ['descope-user-profile-widget', UserProfile],
    ['descope-applications-portal-widget', ApplicationsPortal],
    ['descope-tenant-profile-widget', TenantProfile],
    ['descope-outbound-applications-widget', OutboundApplications],
  ])('renders <%s>', async (tag, Widget: any) => {
    const { container } = render(
      withProvider(<Widget tenant="t1" widgetId="w1" />),
    );
    const el = await findWc(container, tag);

    expect(el).toBeTruthy();
    expect(el.getAttribute('widget-id')).toBe('w1');
  });

  it.each([
    ['sign-in', SignInFlow],
    ['sign-up', SignUpFlow],
    ['sign-up-or-in', SignUpOrInFlow],
  ])('renders the %s default flow', async (flowId, Flow: any) => {
    const { container } = render(withProvider(<Flow />));
    const wc = await findWc(container);

    expect(wc.getAttribute('flow-id')).toBe(flowId);
  });
});
