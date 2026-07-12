// @ts-nocheck
import { apiPaths } from '../../src/constants';
import createSdk from '../../src/sdk';
import { mockHttpClient } from '../utils';

const sdk = createSdk(mockHttpClient);

describe('sso', () => {
  afterEach(() => {
    jest.clearAllMocks();
    mockHttpClient.reset();
  });

  describe('start', () => {
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
      const resp = await sdk.sso.start('tenant-ID');
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        apiPaths.sso.start,
        {},
        {
          queryParams: {
            tenant: 'tenant-ID',
          },
        },
      );

      expect(resp).toEqual({
        code: 200,
        data: httpRespJson,
        ok: true,
        response: httpResponse,
      });
    });
  });

  describe('exchange', () => {
    it('should send the correct request', async () => {
      const httpRespJson = { jwt: 'jwt' };
      const httpResponse = {
        ok: true,
        json: () => httpRespJson,
        clone: () => ({
          json: () => Promise.resolve(httpRespJson),
        }),
        status: 200,
      };
      mockHttpClient.post.mockResolvedValue(httpResponse);
      await sdk.sso.exchange('123456');

      expect(mockHttpClient.post).toHaveBeenCalledWith(apiPaths.sso.exchange, {
        code: '123456',
      });
    });
  });
});
