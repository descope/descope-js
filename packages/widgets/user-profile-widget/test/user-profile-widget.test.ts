import { waitFor } from '@testing-library/dom';
import '@testing-library/jest-dom';
import '../src/lib/index';
import { apiPaths } from '../src/lib/widget/api/apiPaths';
import { createSdk } from '../src/lib/widget/api/sdk';
import {
  getCurrentTenantId,
  getIsRecoveryEmailVerified,
  getIsRecoveryPhoneVerified,
  getRecoveryEmail,
  getRecoveryPhone,
  getUserTenants,
  getVerifiedRecoveryEmail,
  getVerifiedRecoveryPhone,
} from '../src/lib/widget/state/selectors';
import { mockUser } from './mocks/mockUser';
import rootMock from './mocks/rootMock';

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

    it('passkeys', async () => {
      const passkeys = [{ id: 'pk-1', name: 'Passkey 1' }];
      mockHttpClient.post.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(passkeys)),
        json: () => Promise.resolve(passkeys),
      });

      const sdk = createSdk({ projectId: mockProjectId }, false);
      const result = await sdk.passkey.listPasskeys({ userId: 'user-123' });

      expect(mockHttpClient.post).toHaveBeenCalledWith(apiPaths.user.passkeys, {
        loginId: 'user-123',
      });
      expect(result).toEqual(passkeys);
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

    it('reads recovery email/phone + verified flags from state', () => {
      const state = {
        me: {
          data: {
            recoveryEmail: 'rec@example.com',
            verifiedRecoveryEmail: true,
            recoveryPhone: '+15550001111',
            verifiedRecoveryPhone: false,
          },
        },
      } as any;
      expect(getRecoveryEmail(state)).toBe('rec@example.com');
      expect(getIsRecoveryEmailVerified(state)).toBe(true);
      expect(getRecoveryPhone(state)).toBe('+15550001111');
      expect(getIsRecoveryPhoneVerified(state)).toBe(false);
    });

    it('exposes a recovery value only once verified (fulfilled), else empty', () => {
      const verified = {
        me: {
          data: {
            recoveryEmail: 'rec@example.com',
            verifiedRecoveryEmail: true,
            recoveryPhone: '+15550001111',
            verifiedRecoveryPhone: true,
          },
        },
      } as any;
      expect(getVerifiedRecoveryEmail(verified)).toBe('rec@example.com');
      expect(getVerifiedRecoveryPhone(verified)).toBe('+15550001111');

      const pending = {
        me: {
          data: {
            recoveryEmail: 'rec@example.com',
            verifiedRecoveryEmail: false,
            recoveryPhone: '+15550001111',
            verifiedRecoveryPhone: false,
          },
        },
      } as any;
      expect(getVerifiedRecoveryEmail(pending)).toBe('');
      expect(getVerifiedRecoveryPhone(pending)).toBe('');
    });
  });
});
