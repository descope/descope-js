import { waitFor } from '@testing-library/dom';
import '@testing-library/jest-dom';
import '../src/lib/index';
import { apiPaths } from '../src/lib/widget/api/apiPaths';
import { createSdk } from '../src/lib/widget/api/sdk';
import { mockAudit } from './mocks/mockAudit';
import rootMock from './mocks/rootMock';

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
        json: () => Promise.resolve({ audits: mockAudit.audit }),
        text: () =>
          Promise.resolve(JSON.stringify({ audits: mockAudit.audit })),
      }),
    ),
};
mockHttpClient.reset();

jest.mock('@descope/web-js-sdk', () => ({
  __esModule: true,
  default: jest.fn(() => ({ httpClient: mockHttpClient })),
}));

jest.mock('../src/lib/widget/api/sdk/createAuditSdk', () => {
  const actualModule = jest.requireActual(
    '../src/lib/widget/api/sdk/createAuditSdk',
  );
  return {
    __esModule: true,
    createAuditSdk: jest.fn((props) => {
      actualModule.createAuditSdk(props);
      return actualModule.createAuditSdk(props);
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

describe('audit-management-widget', () => {
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
    it('search', async () => {
      const text = 'aaa';
      const from = new Date().getTime();
      const sdk = createSdk({ projectId: mockProjectId }, mockTenant, false);
      const result = await sdk.audit.search({ text, from });

      await waitFor(
        () => expect(mockHttpClient.post).toHaveBeenCalledTimes(1),
        { timeout: 5000 },
      );
      await waitFor(() =>
        expect(mockHttpClient.post).toHaveBeenCalledWith(
          apiPaths.audit.search,
          {
            limit: 10000,
            page: undefined,
            text,
            from,
          },
          {
            queryParams: {
              tenant: mockTenant,
            },
          },
        ),
      );

      expect(result[0].actorId).toEqual(mockAudit.audit[0]['actorId']);
      expect(result[1].actorId).toEqual(mockAudit.audit[1]['actorId']);
    });
  });
});
