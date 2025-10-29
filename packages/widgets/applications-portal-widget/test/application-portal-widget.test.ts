import { waitFor } from '@testing-library/dom';
import '@testing-library/jest-dom';
import '../src/lib/index';
import { apiPaths } from '../src/lib/widget/api/apiPaths';
import { createSdk } from '../src/lib/widget/api/sdk';
import rootMock from './mocks/rootMock';
import { mockSsoApps } from './mocks/mockSsoApps';

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
        json: () => Promise.resolve({ apps: mockSsoApps }),
        text: () => Promise.resolve(JSON.stringify({ apps: mockSsoApps })),
      }),
    ),
};
mockHttpClient.reset();

jest.mock('@descope/web-js-sdk', () => ({
  __esModule: true,
  default: jest.fn(() => ({ httpClient: mockHttpClient })),
}));

jest.mock('../src/lib/widget/api/sdk/createSsoAppsSdk', () => {
  const actualModule = jest.requireActual(
    '../src/lib/widget/api/sdk/createSsoAppsSdk',
  );
  return {
    __esModule: true,
    createSsoAppsSdk: jest.fn((props) => actualModule.createSsoAppsSdk(props)),
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

describe('application-portal-widget', () => {
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
    it('load', async () => {
      const sdk = createSdk({ projectId: mockProjectId }, false);
      const result = await sdk.ssoApps.load();

      await waitFor(() => expect(mockHttpClient.get).toHaveBeenCalledTimes(1), {
        timeout: 5000,
      });
      await waitFor(() =>
        expect(mockHttpClient.get).toHaveBeenCalledWith(apiPaths.ssoApps.load),
      );

      expect(result.apps[0].id).toEqual(mockSsoApps[0].id);
      expect(result.apps[1].id).toEqual(mockSsoApps[1].id);
      expect(result.apps[2].id).toEqual(mockSsoApps[2].id);
    });
  });
});
