import { waitFor } from '@testing-library/dom';
import '@testing-library/jest-dom';
import '../src/lib/index';
import { apiPaths } from '../src/lib/widget/api/apiPaths';
import { createSdk } from '../src/lib/widget/api/sdk';
import {
  mockSsoConfigurations,
  mockTenant,
  mockTenantAdminLinkSSO,
} from './mocks/mockTenant';
import { mockUser } from './mocks/mockUser';
import rootMock from './mocks/rootMock';

const origAppend = document.body.append;

const mockProjectId = 'mockProjectId';
const tenantId = encodeURIComponent(mockTenant.tenantId);

export const mockHttpClient = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  reset: () => {
    mockHttpClient.get.mockImplementation((url) => {
      if (url.includes(apiPaths.tenant.ssoConfigurations)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockSsoConfigurations),
          text: () => Promise.resolve(JSON.stringify(mockSsoConfigurations)),
        });
      }
      if (url.includes(apiPaths.tenant.details)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockTenant),
          text: () => Promise.resolve(JSON.stringify(mockTenant)),
        });
      }
      if (url.includes(apiPaths.user.me)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockUser),
          text: () => Promise.resolve(JSON.stringify(mockUser)),
        });
      }
      // Default fallback
      return Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(''),
      });
    });
    mockHttpClient.post.mockImplementation((url) => {
      if (url.includes(apiPaths.tenant.adminLinkSso)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockTenantAdminLinkSSO),
          text: () =>
            Promise.resolve(
              JSON.stringify({
                adminSSOConfigurationLink:
                  'https://api.descope.TESTEST/sso/setup?tenantId=tenant-1',
              }),
            ),
        });
      }
      if (url.includes(apiPaths.tenant.ssoConfigurations)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              id: 'new-sso',
              name: 'New SSO',
            }),
          text: () => Promise.resolve('{}'),
        });
      }
      // Default fallback
      return Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(''),
      });
    });
    mockHttpClient.delete.mockImplementation((url) => {
      if (url.includes(apiPaths.tenant.ssoConfigurations)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({}),
          text: () => Promise.resolve('{}'),
        });
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve('{}'),
      });
    });
  },
};
mockHttpClient.reset();

jest.mock('@descope/web-js-sdk', () => ({
  __esModule: true,
  default: jest.fn(() => ({ httpClient: mockHttpClient })),
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

jest.mock('../src/lib/widget/api/sdk/createTenantSdk', () => {
  const actualModule = jest.requireActual(
    '../src/lib/widget/api/sdk/createTenantSdk',
  );
  return {
    __esModule: true,
    createTenantSdk: jest.fn((props) => {
      actualModule.createTenantSdk(props);
      return actualModule.createTenantSdk(props);
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

describe('tenant-profile-widget', () => {
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
    document.body.append = origAppend;
    mockHttpClient.reset();
  });

  describe('sdk', () => {
    it('me', async () => {
      const sdk = createSdk({ projectId: mockProjectId }, 'tenant-1', false);
      const result = await sdk.user.me();

      await waitFor(() => expect(mockHttpClient.get).toHaveBeenCalledTimes(1), {
        timeout: 5000,
      });
      await waitFor(() =>
        expect(mockHttpClient.get).toHaveBeenCalledWith(apiPaths.user.me),
      );

      expect(result).toEqual(mockUser);
    });

    it('tenant', async () => {
      const sdk = createSdk({ projectId: mockProjectId }, tenantId, false);

      const tenantResult = await sdk.tenant.details();
      await waitFor(() => expect(mockHttpClient.get).toHaveBeenCalledTimes(1), {
        timeout: 5000,
      });
      await waitFor(() =>
        expect(mockHttpClient.get).toHaveBeenCalledWith(
          `${apiPaths.tenant.details}?tenant=${tenantId}&id=${tenantId}`,
        ),
      );
      expect(tenantResult).toEqual(mockTenant);
    });

    it('tenant admin link sso', async () => {
      const sdk = createSdk({ projectId: mockProjectId }, tenantId, false);
      const result = await sdk.tenant.adminLinkSso();

      await waitFor(
        () => expect(mockHttpClient.post).toHaveBeenCalledTimes(1),
        {
          timeout: 5000,
        },
      );
      await waitFor(() =>
        expect(mockHttpClient.post).toHaveBeenCalledWith(
          `${apiPaths.tenant.adminLinkSso}?tenant=${tenantId}`,
          { tenantId },
          { headers: { 'Content-Type': 'application/json' } },
        ),
      );

      expect(result).toEqual(mockTenantAdminLinkSSO);
    });

    it('list sso configurations', async () => {
      const sdk = createSdk({ projectId: mockProjectId }, tenantId, false);
      const result = await sdk.tenant.listSsoConfigs();

      await waitFor(
        () => expect(mockHttpClient.get).toHaveBeenCalledTimes(1),
        { timeout: 5000 },
      );
      await waitFor(() =>
        expect(mockHttpClient.get).toHaveBeenCalledWith(
          `${apiPaths.tenant.ssoConfigurations}?tenant=${tenantId}`,
        ),
      );
      expect(result).toEqual(mockSsoConfigurations);
    });

    it('create sso configuration', async () => {
      const sdk = createSdk({ projectId: mockProjectId }, tenantId, false);
      await sdk.tenant.createSsoConfig({ name: 'New SSO', id: 'new-sso' });

      await waitFor(
        () => expect(mockHttpClient.post).toHaveBeenCalledTimes(1),
        { timeout: 5000 },
      );
      await waitFor(() =>
        expect(mockHttpClient.post).toHaveBeenCalledWith(
          `${apiPaths.tenant.ssoConfigurations}?tenant=${tenantId}`,
          { name: 'New SSO', id: 'new-sso' },
          { headers: { 'Content-Type': 'application/json' } },
        ),
      );
    });

    it('delete sso configuration', async () => {
      const sdk = createSdk({ projectId: mockProjectId }, tenantId, false);
      await sdk.tenant.deleteSsoConfig({ id: 'okta-prod' });

      await waitFor(
        () => expect(mockHttpClient.delete).toHaveBeenCalledTimes(1),
        { timeout: 5000 },
      );
      await waitFor(() =>
        expect(mockHttpClient.delete).toHaveBeenCalledWith(
          `${apiPaths.tenant.ssoConfigurations}/${encodeURIComponent('okta-prod')}?tenant=${tenantId}`,
        ),
      );
    });
  });
});
