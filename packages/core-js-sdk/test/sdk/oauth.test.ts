// @ts-nocheck
import { apiPaths } from '../../src/constants';
import createSdk from '../../src/sdk';
import { mockHttpClient } from '../utils';

const sdk = createSdk(mockHttpClient);

describe('oauth', () => {
  afterEach(() => {
    jest.clearAllMocks();
    mockHttpClient.reset();
  });
  describe('start', () => {
    it('should return the correct url', async () => {
      delete window.location;
      window.location = new URL('https://www.example.com');
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
      const resp = await sdk.oauth.start.facebook();
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        apiPaths.oauth.start,
        {},
        {
          queryParams: {
            provider: 'facebook',
          },
        }
      );

      expect(resp).toEqual({
        code: 200,
        data: httpRespJson,
        ok: true,
        response: httpResponse,
      });
    });

    it('should override the redirect url when provided', () => {
      sdk.oauth.start.facebook('http://redirecturl.com/');
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        apiPaths.oauth.start,
        {},
        {
          queryParams: {
            provider: 'facebook',
            redirectURL: 'http://redirecturl.com/',
          },
        }
      );
    });

    it('should override the redirect url when provided and login options', () => {
      sdk.oauth.start.facebook(
        'http://redirecturl.com/',
        { stepup: true, customClaims: { k1: 'v1' } },
        'token'
      );
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        apiPaths.oauth.start,
        { stepup: true, customClaims: { k1: 'v1' } },
        {
          queryParams: {
            provider: 'facebook',
            redirectURL: 'http://redirecturl.com/',
          },
          token: 'token',
        }
      );
    });
  });

  describe('exchange', () => {
    it('should throw an error when code is not a string', () => {
      expect(sdk.oauth.exchange).toThrow('"code" must be a string');
    });

    it('should throw an error when code is empty', () => {
      expect(() => sdk.oauth.exchange('')).toThrow('"code" must not be empty');
    });

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
      await sdk.oauth.exchange('123456');

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        apiPaths.oauth.exchange,
        {
          code: '123456',
        }
      );
    });

    it('should return the correct response', async () => {
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
      const resp = await sdk.oauth.exchange('123456');
      expect(resp).toEqual({
        code: 200,
        data: httpRespJson,
        ok: true,
        response: httpResponse,
      });
    });
  });
});
