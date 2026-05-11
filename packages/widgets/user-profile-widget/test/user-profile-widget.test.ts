import { waitFor } from '@testing-library/dom';
import '@testing-library/jest-dom';
import '../src/lib/index';
import { apiPaths } from '../src/lib/widget/api/apiPaths';
import { createSdk } from '../src/lib/widget/api/sdk';
import {
  getCurrentTenantId,
  getUserTenants,
} from '../src/lib/widget/state/selectors';
import { mockUser } from './mocks/mockUser';
import rootMock from './mocks/rootMock';

// jsdom@20 defines CSSStyleSheet.replaceSync but does not implement it — override it unconditionally
CSSStyleSheet.prototype.replaceSync = function () {};

const origAppend = document.body.append;

const mockProjectId = 'mockProjectId';

export const mockHttpClient = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  reset: () =>
    ['get'].forEach((key) =>
      mockHttpClient[key].mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockUser),
        text: () => Promise.resolve(JSON.stringify(mockUser)),
      }),
    ),
};
mockHttpClient.reset();

jest.mock('@descope/web-js-sdk', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    httpClient: mockHttpClient,
    logout: jest.fn(() => Promise.resolve()),
  })),
  getSessionToken: jest.fn(() => 'mock-session-token'),
}));

jest.mock('../src/lib/widget/api/sdk/createUserSdk', () => {
  const actualModule = jest.requireActual(
    '../src/lib/widget/api/sdk/createUserSdk',
  );
  return {
    __esModule: true,
    createUserSdk: jest.fn((props) => {
      actualModule.createUserSdk(props);
      return actualModule.createUserSdk(props);
    }),
  };
});

const themeContent = {};
const configContent = {
  flows: {
    flow1: { version: 1 },
  },
  componentsVersion: '1.2.3',
};

const fetchMock: jest.Mock = jest.fn();
global.fetch = fetchMock;

describe('user-profile-widget', () => {
  beforeEach(() => {
    fetchMock.mockImplementation((url: string) => {
      const res = {
        ok: true,
        headers: new Headers({}),
      };

      switch (true) {
        case url.endsWith('theme.json'): {
          return { ...res, json: () => themeContent };
        }
        case url.endsWith('config.json'): {
          return { ...res, json: () => configContent };
        }
        case url.endsWith('root.html'): {
          return { ...res, text: () => rootMock };
        }
        default: {
          return { ok: false };
        }
      }
    });
  });

  afterEach(() => {
    document.getElementsByTagName('head')[0].innerHTML = '';
    document.getElementsByTagName('body')[0].innerHTML = '';
    document.body.append = origAppend;
    mockHttpClient.reset();
  });

  describe('sdk', () => {
    it('me', async () => {
      const sdk = createSdk({ projectId: mockProjectId }, false);
      const result = await sdk.user.me();

      await waitFor(() => expect(mockHttpClient.get).toHaveBeenCalledTimes(1), {
        timeout: 5000,
      });
      await waitFor(() =>
        expect(mockHttpClient.get).toHaveBeenCalledWith(apiPaths.user.me),
      );

      expect(result).toEqual(mockUser);
    });

    it('setCurrentTenant', async () => {
      mockHttpClient.post.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({})),
        json: () => Promise.resolve({}),
      });

      const sdk = createSdk({ projectId: mockProjectId }, false);
      await sdk.user.setCurrentTenant('tenant-123');

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        apiPaths.user.selectTenant,
        { tenant: 'tenant-123' },
      );
    });
  });

  describe('selectors', () => {
    it('getCurrentTenantId should return currentTenantId from state', () => {
      const state = {
        tenant: { currentTenantId: 'tenant-123' },
      } as any;
      expect(getCurrentTenantId(state)).toBe('tenant-123');
    });

    it('getUserTenants should return user tenants from state', () => {
      const tenants = [{ tenantId: 't1', tenantName: 'Tenant 1' }];
      const state = {
        me: { data: { userTenants: tenants } },
      } as any;
      expect(getUserTenants(state)).toEqual(tenants);
    });

    it('getUserTenants should return empty array when undefined', () => {
      const state = {
        me: { data: {} },
      } as any;
      expect(getUserTenants(state)).toEqual([]);
    });
  });

  describe('generic flow button', () => {
    const FLOW_ID = 'my-test-flow';

    const genericFlowButtonRoot = `
      <descope-button
        data-generic-flow-button-id="test-btn"
        flow-id="${FLOW_ID}"
      >Run Flow</descope-button>
    `;

    const createAndInitWidget = async () => {
      const w = document.createElement(
        'descope-user-profile-widget',
      ) as HTMLElement;
      w.setAttribute('project-id', mockProjectId);
      w.setAttribute('widget-id', 'test-widget');
      const ready = new Promise<void>((resolve) =>
        w.addEventListener('ready', () => resolve(), { once: true }),
      );
      document.body.append(w);
      await ready;
      return w;
    };

    beforeAll(() => {
      // descopeUiMixin (dist/cjs) awaits CDN script loading which never resolves in jsdom.
      // Patch the widget prototype chain so descopeUi resolves immediately.
      const WidgetCtor = customElements.get(
        'descope-user-profile-widget',
      ) as CustomElementConstructor;
      let p: any = WidgetCtor?.prototype;
      while (p) {
        if (Object.getOwnPropertyDescriptor(p, 'descopeUi')) {
          Object.defineProperty(p, 'descopeUi', {
            get() {
              return Promise.resolve({});
            },
            configurable: true,
          });
          break;
        }
        p = Object.getPrototypeOf(p);
      }
      p = WidgetCtor?.prototype;
      while (p) {
        if (Object.getOwnPropertyDescriptor(p, 'loadDescopeUiComponents')) {
          p.loadDescopeUiComponents = () => Promise.resolve([]);
          break;
        }
        p = Object.getPrototypeOf(p);
      }
    });

    beforeEach(() => {
      fetchMock.mockImplementation((url: string) => {
        const res = { ok: true, headers: new Headers({}) };
        if (url.endsWith('theme.json'))
          return { ...res, json: () => themeContent };
        if (url.endsWith('config.json'))
          return { ...res, json: () => configContent };
        if (url.endsWith('root.html'))
          return { ...res, text: () => genericFlowButtonRoot };
        return { ok: false };
      });
    });

    it('discovers [data-generic-flow-button-id] and enables it on init', async () => {
      const w = await createAndInitWidget();

      const button = w.shadowRoot?.querySelector(
        '[data-generic-flow-button-id]',
      );
      expect(button).not.toBeNull();
      expect(button).not.toHaveAttribute('disabled');
    });

    it('sets correct flow-id and client.userId on descope-wc when button is clicked', async () => {
      const w = await createAndInitWidget();

      (
        w.shadowRoot?.querySelector(
          '[data-generic-flow-button-id]',
        ) as HTMLElement
      )?.click();

      const modal = w.shadowRoot?.querySelector(
        'descope-modal[data-id="generic-flow-modal"]',
      );
      const descopeWc = modal?.querySelector('descope-wc');

      expect(descopeWc).toBeTruthy();
      expect(descopeWc?.getAttribute('flow-id')).toBe(FLOW_ID);
      expect(descopeWc?.getAttribute('project-id')).toBe(mockProjectId);

      const client = JSON.parse(descopeWc?.getAttribute('client') ?? '{}');
      expect(client.userId).toBe(mockUser.userId);
    });

    it('opens the modal when descope-wc fires page-updated', async () => {
      const w = await createAndInitWidget();

      (
        w.shadowRoot?.querySelector(
          '[data-generic-flow-button-id]',
        ) as HTMLElement
      )?.click();

      const modal = w.shadowRoot?.querySelector(
        'descope-modal[data-id="generic-flow-modal"]',
      );
      modal
        ?.querySelector('descope-wc')
        ?.dispatchEvent(new Event('page-updated'));

      // ModalDriver.open() is async; flush the microtask queue before asserting
      await Promise.resolve();

      expect(modal).toHaveAttribute('opened');
    });

    it('calls getMe action when descope-wc fires success', async () => {
      const w = await createAndInitWidget();

      (
        w.shadowRoot?.querySelector(
          '[data-generic-flow-button-id]',
        ) as HTMLElement
      )?.click();

      const modal = w.shadowRoot?.querySelector(
        'descope-modal[data-id="generic-flow-modal"]',
      );

      mockHttpClient.get.mockClear();
      modal?.querySelector('descope-wc')?.dispatchEvent(new Event('success'));

      await waitFor(
        () => expect(mockHttpClient.get).toHaveBeenCalledWith(apiPaths.user.me),
        { timeout: 3000 },
      );
    });
  });
});
