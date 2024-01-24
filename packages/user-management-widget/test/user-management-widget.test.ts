import { fireEvent, waitFor } from '@testing-library/dom';
import  '@testing-library/jest-dom';
import { screen, getByShadowTitle, logShadowDOM, shadowQueries, findByShadowLabelText } from 'shadow-dom-testing-library';
import { apiPaths } from '../src/lib/widget/api/apiPaths';
import { usersMock } from './mocks/usersMock';
import * as devDescopeUI from "@descope/web-components-ui";
import '../src/lib/index';
import { createSdk } from '../src/lib/widget/api/sdk';
import { pluralize } from '../src/lib/helpers/generic';

import { searchUser } from '../src/lib/widget/state/asyncActions';
import { stateUpdateMixin } from '../src/lib/widget/mixins/stateUpdateMixin';

globalThis.DescopeUI = {
  'descope-button': () => devDescopeUI.ButtonClass,
  'descope-text': () => devDescopeUI.TextClass,
  'descope-text-field': () => devDescopeUI.TextFieldClass,
  'descope-email-field': () => devDescopeUI.EmailFieldClass,
  'descope-phone-field': () => devDescopeUI.PhoneFieldClass,
  'descope-container': () => devDescopeUI.ContainerClass,
  'descope-grid': () => devDescopeUI.GridClass,
  'descope-grid-selection-column': () => devDescopeUI.GridSelectionColumnClass,
  'descope-grid-text-column': () => devDescopeUI.GridTextColumnClass,
  'descope-modal': () => devDescopeUI.ModalClass,
  'descope-notification': () => devDescopeUI.NotificationClass,
};

const origAppend = document.body.append;

export const mockHttpClient = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  reset: () => {
    return ['post'].forEach((key) => {
      mockHttpClient[key].mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(usersMock),
      })
    })
    // ['get', 'post', 'put', 'delete'].forEach((key) =>
    //   mockHttpClient[key].mockResolvedValue({
    //     ok: true,
    //     json: () => Promise.resolve({ body: 'body' }),
    //     clone: () => ({
    //       json: () => Promise.resolve({ body: 'body' }),
    //     }),
    //     status: 200,
    //   })
    // ),
  }
};
mockHttpClient.reset();

jest.mock('@descope/web-js-sdk', () => {
  return {
    __esModule: true,
    default: jest.fn(() => ({ httpClient: mockHttpClient })),
  };
});

jest.mock('../src/lib/widget/api/sdk/createUserSdk', () => {
  const actualModule = jest.requireActual('../src/lib/widget/api/sdk/createUserSdk');
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
    'flow1': { version: 1 },
  },
  componentsVersion: '1.2.3',
};

const fetchMock: jest.Mock = jest.fn();
global.fetch = fetchMock;

const template = `<user-management-widget project-id="p1" tenant="tplMockTenant"></user-management-widget>`;

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

      await waitFor(() => expect(mockHttpClient.post).toHaveBeenCalledTimes(1), { timeout: 5000 });
      await waitFor(() => expect(mockHttpClient.post).toHaveBeenCalledWith(
        apiPaths.user.search,
        {
          customAttributes: undefined,
          emails: undefined,
          limit: 10000,
          page: undefined,
          phones: undefined,
          statuses: undefined,
          withTestUser: false
        },
        {
          queryParams: {
            tenant: "mockTenant"
          }
        }
      ));

      expect(result[0].loginIds[0]).toEqual('user1@user1.com')
      expect(result[1].loginIds[0]).toEqual('user2@user2.com')
    });

    it('delete', async () => {
      const sdk = createSdk({ projectId: 'p1' }, 'mockTenant');
      const loginIds = ['user1@user1.com', 'user2@user2.com'];

      await sdk.user.delete(loginIds);

      await waitFor(() => expect(mockHttpClient.post).toHaveBeenCalledTimes(1), { timeout: 5000 });
      await waitFor(() => expect(mockHttpClient.post).toHaveBeenCalledWith(
        apiPaths.user.delete,
        { loginId: loginIds[0] },
        {
          queryParams: {
            tenant: "mockTenant"
          }
        }
      ));
    });

    it('deleteBatch', async () => {
      const sdk = createSdk({ projectId: 'p1' }, 'mockTenant');
      const loginIds = ['user1@user1.com', 'user2@user2.com'];

      await sdk.user.deleteBatch(loginIds);

      await waitFor(() => expect(mockHttpClient.post).toHaveBeenCalledTimes(1), { timeout: 5000 });
      await waitFor(() => expect(mockHttpClient.post).toHaveBeenCalledWith(
        apiPaths.user.deleteBatch,
        { userIds: loginIds },
        {
          queryParams: {
            tenant: "mockTenant"
          }
        }
      ));
    });

    it('expirePassword', async () => {
      const sdk = createSdk({ projectId: 'p1' }, 'mockTenant');
      const loginId = 'user1@user1.com';

      await sdk.user.expirePassword([loginId]);

      await waitFor(() => expect(mockHttpClient.post).toHaveBeenCalledTimes(1), { timeout: 5000 });
      await waitFor(() => expect(mockHttpClient.post).toHaveBeenCalledWith(
        apiPaths.user.expirePassword,
        { loginId },
        {
          queryParams: {
            tenant: "mockTenant"
          }
        }
      ));
    });
  });

  describe('widget', () => {
    it('should have shadow root', async () => {
      document.body.innerHTML = template;
      const shadowEle = document.getElementsByTagName('user-management-widget')[0].shadowRoot;
      await waitFor(() => expect(shadowEle).toBeTruthy(), { timeout: 5000 });
    });

    it('should fetch users on load', async () => {
      document.body.innerHTML = template;

      await waitFor(() => expect(mockHttpClient.post).toHaveBeenCalledTimes(1), { timeout: 5000 });
      await waitFor(() => expect(mockHttpClient.post).toHaveBeenCalledWith(
        apiPaths.user.search,
        {
          customAttributes: undefined,
          emails: undefined,
          limit: 10000,
          page: undefined,
          phones: undefined,
          statuses: undefined,
          withTestUser: false
        },
        {
          queryParams: {
            tenant: 'tplMockTenant'
          }
        }
      ), { timeout: 5000 });
    });

    it('should have add button', async () => {
      document.body.innerHTML = template;
      const userAddButton = await waitFor(() => screen.findByShadowText('+ User'), { timeout: 5000 });
      await waitFor(() => expect(userAddButton).toBeInTheDocument());
    });

    it.skip('should have delete button', async () => {
      document.body.innerHTML = template;
      const userDeleteButton = await waitFor(() => screen.findAllByRole('button'), { timeout: 5000 });
      await waitFor(() => expect(userDeleteButton).toBeDisabled());
      // await waitFor(() => expect(userDeleteButton.textContent).toBe('Delete'));
    });

    it('should have search input', async () => {
      document.body.innerHTML = template;
      const userSearchInput = await waitFor(() => screen.findByShadowPlaceholderText('Search'), { timeout: 5000 });
      await waitFor(() => expect(userSearchInput).toBeInTheDocument());
    });

    it('should display users table', async () => {
      document.body.innerHTML = template;
      // await waitFor(() => expect(screen.getByShadowText('user1@user1.com')).toBeInTheDocument(), { timeout: 10000000 });
    }, 10000000);

    it.skip('should create user', async () => {
      document.body.innerHTML = template;

      // await waitFor(() => expect(screen.getByRole('modal')).not.toBeVisible(), { timeout: 5000 });

      const shadowEle = document.getElementsByTagName('user-management-widget')[0].shadowRoot;
      await waitFor(() => expect(shadowEle).toBeTruthy(), { timeout: 5000 });

      const button = await waitFor(() => screen.findByShadowText('+ User'), {
        timeout: 10000,
      });

      await waitFor(() => fireEvent.click(button))

      const loginIdInput = await waitFor(() => screen.findByShadowLabelText('user1@user1.com'), {
        timeout: 10000,
      });
    });
  });

  describe('utils', () => {
    it('should pluralize messages', () => {
      expect(pluralize(1)`${['', 2]}${['U', 'u']}ser${['', 's']} deleted successfully`).toEqual('User deleted successfully');
      expect(pluralize(2)`${['', 2]} ${['U', 'u']}ser${['', 's']} deleted successfully`).toEqual('2 users deleted successfully');
    })
  })
});
