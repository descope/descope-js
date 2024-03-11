import { enableUser } from './../src/lib/widget/state/asyncActions/enableUser';
import '@testing-library/jest-dom';
import { waitFor } from '@testing-library/dom';
import { apiPaths } from '../src/lib/widget/api/apiPaths';
import { mockUsers } from './mocks/mockUsers';
import { createSdk } from '../src/lib/widget/api/sdk';
import { pluralize } from '../src/lib/helpers/generic';
import '../src/lib/index';
import rootMock from './mocks/rootMock';
import createUserModalMock from './mocks/createUserModalMock';
import deleteUserModalMock from './mocks/deleteUserModalMock';
import enableUserModalMock from './mocks/enableUserModalMock';
import disableUserModalMock from './mocks/disableUserModalMock';
import removePasskeyModalMock from './mocks/removePasskeyModalMock';

const origAppend = document.body.append;

const mockProjectId = 'mockProjectId';
const mockTenant = 'mockTenant';

export const mockHttpClient = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  reset: () =>
    ['post'].forEach((key) =>
      mockHttpClient[key].mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ users: mockUsers }),
        text: () => Promise.resolve(JSON.stringify({ users: mockUsers })),
      }),
    ),
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

const themeContent = {};
const configContent = {
  flows: {
    flow1: { version: 1 },
  },
  componentsVersion: '1.2.3',
};

const fetchMock: jest.Mock = jest.fn();
global.fetch = fetchMock;

describe('user-management-widget', () => {
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
        case url.endsWith('create-user-modal.html'): {
          return { ...res, text: () => createUserModalMock };
        }
        case url.endsWith('delete-user-modal.html'): {
          return { ...res, text: () => deleteUserModalMock };
        }
        case url.endsWith('enable-user-modal.html'): {
          return { ...res, text: () => enableUserModalMock };
        }
        case url.endsWith('disable-user-modal.html'): {
          return { ...res, text: () => disableUserModalMock };
        }
        case url.endsWith('remove-passkey-modal.html'): {
          return { ...res, text: () => removePasskeyModalMock };
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
    it('search', async () => {
      const sdk = createSdk({ projectId: mockProjectId }, mockTenant);
      const result = await sdk.user.search({});

      await waitFor(
        () => expect(mockHttpClient.post).toHaveBeenCalledTimes(1),
        { timeout: 5000 },
      );
      await waitFor(() =>
        expect(mockHttpClient.post).toHaveBeenCalledWith(
          apiPaths.user.search,
          {
            customAttributes: undefined,
            emails: undefined,
            limit: 10000,
            page: undefined,
            phones: undefined,
            statuses: undefined,
            withTestUser: false,
          },
          {
            queryParams: {
              tenant: mockTenant,
            },
          },
        ),
      );

      expect(result[0].loginIds[0]).toEqual(mockUsers[0]['loginIds'][0]);
      expect(result[1].loginIds[0]).toEqual(mockUsers[1]['loginIds'][0]);
    });

    it('deleteBatch', async () => {
      const sdk = createSdk({ projectId: mockProjectId }, mockTenant);
      const loginIds = [
        mockUsers[0]['loginIds'][0],
        mockUsers[1]['loginIds'][0],
      ];

      await sdk.user.deleteBatch(loginIds);

      await waitFor(
        () => expect(mockHttpClient.post).toHaveBeenCalledTimes(1),
        { timeout: 5000 },
      );
      await waitFor(() =>
        expect(mockHttpClient.post).toHaveBeenCalledWith(
          apiPaths.user.deleteBatch,
          { userIds: loginIds },
          {
            queryParams: {
              tenant: mockTenant,
            },
          },
        ),
      );
    });

    it('expirePassword', async () => {
      const sdk = createSdk({ projectId: mockProjectId }, mockTenant);
      const loginId = mockUsers[0]['loginIds'][0];

      await sdk.user.expirePassword([loginId]);

      await waitFor(
        () => expect(mockHttpClient.post).toHaveBeenCalledTimes(1),
        { timeout: 5000 },
      );
      await waitFor(() =>
        expect(mockHttpClient.post).toHaveBeenCalledWith(
          apiPaths.user.expirePassword,
          { loginId },
          {
            queryParams: {
              tenant: mockTenant,
            },
          },
        ),
      );
    });

    it('enableUser', async () => {
      const sdk = createSdk({ projectId: mockProjectId }, mockTenant);
      const loginId = mockUsers[0]['loginIds'][0];

      await sdk.user.enable(loginId);

      await waitFor(
        () => expect(mockHttpClient.post).toHaveBeenCalledTimes(1),
        { timeout: 5000 },
      );
      await waitFor(() =>
        expect(mockHttpClient.post).toHaveBeenCalledWith(
          apiPaths.user.enable,
          { loginId },
          {
            queryParams: {
              tenant: mockTenant,
            },
          },
        ),
      );
    });

    it('disableUser', async () => {
      const sdk = createSdk({ projectId: mockProjectId }, mockTenant);
      const loginId = mockUsers[0]['loginIds'][0];

      await sdk.user.enable(loginId);

      await waitFor(
        () => expect(mockHttpClient.post).toHaveBeenCalledTimes(1),
        { timeout: 5000 },
      );
      await waitFor(() =>
        expect(mockHttpClient.post).toHaveBeenCalledWith(
          apiPaths.user.disable,
          { loginId },
          {
            queryParams: {
              tenant: mockTenant,
            },
          },
        ),
      );
    });    
  });

  describe('utils', () => {
    it('should pluralize messages', () => {
      expect(
        pluralize(1)`${['', 2]}${['U', 'u']}ser${[
          '',
          's',
        ]} deleted successfully`,
      ).toEqual('User deleted successfully');
      expect(
        pluralize(2)`${['', 2]} ${['U', 'u']}ser${[
          '',
          's',
        ]} deleted successfully`,
      ).toEqual('2 users deleted successfully');
    });
  });
});
