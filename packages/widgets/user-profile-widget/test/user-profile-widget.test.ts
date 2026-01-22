import { waitFor } from '@testing-library/dom';
import '@testing-library/jest-dom';
import '../src/lib/index';
import { apiPaths } from '../src/lib/widget/api/apiPaths';
import { createSdk } from '../src/lib/widget/api/sdk';
import { decodeJWT } from '../src/lib/widget/helpers';
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
    getSessionToken: jest.fn(() => 'mock-session-token'),
    logout: jest.fn(() => Promise.resolve()),
  })),
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
  });

  describe('helpers', () => {
    describe('decodeJWT', () => {
      it('should decode a valid JWT token', () => {
        // Valid JWT: header.payload.signature
        // Payload: {"sub":"1234567890","name":"John Doe","dct":"tenant123","iat":1516239022}
        const validToken =
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiZGN0IjoidGVuYW50MTIzIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

        const decoded = decodeJWT(validToken);

        expect(decoded).toEqual({
          sub: '1234567890',
          name: 'John Doe',
          dct: 'tenant123',
          iat: 1516239022,
        });
      });

      it('should handle JWT without dct claim', () => {
        // Payload: {"sub":"1234567890","name":"Jane Doe","iat":1516239022}
        const tokenWithoutDct =
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkphbmUgRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

        const decoded = decodeJWT(tokenWithoutDct);

        expect(decoded).toEqual({
          sub: '1234567890',
          name: 'Jane Doe',
          iat: 1516239022,
        });
        expect(decoded.dct).toBeUndefined();
      });

      it('should return null for invalid JWT', () => {
        const invalidToken = 'invalid.token.format';
        const decoded = decodeJWT(invalidToken);
        expect(decoded).toBeNull();
      });

      it('should return null for malformed JWT', () => {
        const malformedToken = 'not-a-jwt';
        const decoded = decodeJWT(malformedToken);
        expect(decoded).toBeNull();
      });

      it('should return null for empty string', () => {
        const emptyToken = '';
        const decoded = decodeJWT(emptyToken);
        expect(decoded).toBeNull();
      });
    });
  });
});
