// @ts-nocheck
import { apiPaths } from '../../src/constants';
import createSdk from '../../src/sdk';
import { mockHttpClient } from '../utils';

const sdk = createSdk(mockHttpClient);

describe('outbound', () => {
  afterEach(() => {
    jest.clearAllMocks();
    mockHttpClient.reset();
  });
  describe('connect', () => {
    it('should return the correct url', async () => {
      const httpRespJson = { url: 'http://redirecturl.com/' };
      const httpResponse = {
        ok: true,
        json: () => Promise.resolve(httpRespJson),
        clone: () => ({
          json: () => Promise.resolve(httpRespJson),
        }),
        status: 200,
      };
      mockHttpClient.post.mockResolvedValueOnce(httpResponse);
      const resp = await sdk.outbound.connect('google', {}, '');
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        apiPaths.outbound.connect,
        {
          appId: 'google',
          options: {},
        },
        {
          token: '',
        },
      );

      expect(resp).toEqual({
        code: 200,
        data: httpRespJson,
        ok: true,
        response: httpResponse,
      });
    });

    it('should send the options and token when provided', () => {
      sdk.outbound.connect(
        'google',
        {
          redirectUrl: 'http://new.com/',
          scopes: '["s1", "s2"]',
          tenantId: 't1',
          tenantLevel: true,
        },
        'token',
      );
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        apiPaths.outbound.connect,
        {
          appId: 'google',
          options: {
            redirectUrl: 'http://new.com/',
            scopes: '["s1", "s2"]',
          },
          tenantId: 't1',
          tenantLevel: true,
        },
        {
          token: 'token',
        },
      );
    });

    it('should fail connect without appId', () => {
      expect(() => sdk.outbound.connect('', {})).toThrow(
        '"appId" must not be empty',
      );
    });
  });
});
