import '@testing-library/jest-dom';
import { waitFor } from '@testing-library/dom';
import { apiPaths } from '../src/lib/widget/api/apiPaths';
import { mockUsers } from './mocks/mockUsers';
import { createSdk } from '../src/lib/widget/api/sdk';
import { pluralize } from '../src/lib/helpers/generic';
import '../src/lib/index';

const origAppend = document.body.append;

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
      const sdk = createSdk({ projectId: 'p1' }, 'mockTenant');
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
              tenant: 'mockTenant',
            },
          },
        ),
      );

      expect(result[0].loginIds[0]).toEqual('user1@user1.com');
      expect(result[1].loginIds[0]).toEqual('user2@user2.com');
    });

    it('deleteBatch', async () => {
      const sdk = createSdk({ projectId: 'p1' }, 'mockTenant');
      const loginIds = ['user1@user1.com', 'user2@user2.com'];

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
              tenant: 'mockTenant',
            },
          },
        ),
      );
    });

    it('expirePassword', async () => {
      const sdk = createSdk({ projectId: 'p1' }, 'mockTenant');
      const loginId = 'user1@user1.com';

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
              tenant: 'mockTenant',
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
