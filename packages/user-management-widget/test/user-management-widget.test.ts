import '@testing-library/jest-dom';
import { waitFor } from '@testing-library/dom';
import { screen } from 'shadow-dom-testing-library';
import { apiPaths } from '../src/lib/widget/api/apiPaths';
import { usersMock } from './mocks/usersMock';
import { createSdk } from '../src/lib/widget/api/sdk';
import { pluralize } from '../src/lib/helpers/generic';
import '../src/lib/index';
// import '@descope/web-components-ui';

// globalThis.DescopeUI = {
//   'descope-button': () => { },
//   'descope-container': () => { },
//   'descope-grid': () => { },
//   'descope-grid-text-column': () => { },
//   'descope-grid-selection-column': () => { },
//   'descope-modal': () => { },
//   'descope-notification': () => { },
//   'descope-text-field': () => { },
//   'descope-text': () => { },
//   'descope-phone-field': () => { },
//   'descope-email-field': () => { }
// };

const widgetTagName = 'descope-user-management-widget';
const template = `<${widgetTagName} project-id="p1" tenant="tplMockTenant"></${widgetTagName}>`;

const addWidget = () => {
  document.body.innerHTML = template;
};

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
        json: () => Promise.resolve(usersMock),
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
    // jest.resetAllMocks();
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

  describe.skip('widget', () => {
    it('should have shadow root', async () => {
      addWidget();
      const shadowEle = document.getElementsByTagName(
        'user-management-widget',
      )[0].shadowRoot;
      await waitFor(() => expect(shadowEle).toBeTruthy(), { timeout: 5000 });
    });

    it('should fetch users on load', async () => {
      addWidget();

      await waitFor(
        () => expect(mockHttpClient.post).toHaveBeenCalledTimes(1),
        { timeout: 5000 },
      );
      await waitFor(
        () =>
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
                tenant: 'tplMockTenant',
              },
            },
          ),
        { timeout: 5000 },
      );
    });

    it('should have add button', async () => {
      addWidget();
      const userAddButton = await waitFor(
        () => screen.findByShadowText('+ User'),
        { timeout: 5000 },
      );
      await waitFor(() => expect(userAddButton).toBeInTheDocument());
    });

    it.skip('should have delete button', async () => {
      document.body.innerHTML = template;
      const userDeleteButton = await waitFor(
        () => screen.findAllByRole('button'),
        { timeout: 5000 },
      );
      await waitFor(() => expect(userDeleteButton).toBeDisabled());
      // await waitFor(() => expect(userDeleteButton.textContent).toBe('Delete'));
    });

    it('should have search input', async () => {
      addWidget();
      const userSearchInput = await waitFor(
        () => screen.findByShadowPlaceholderText('Search'),
        { timeout: 5000 },
      );
      await waitFor(() => expect(userSearchInput).toBeInTheDocument());
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
