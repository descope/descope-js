// @ts-nocheck
import { apiPaths } from '../../src/constants';
import createSdk from '../../src/sdk';
import { mockHttpClient } from '../utils';

const sdk = createSdk(mockHttpClient);

describe('saml', () => {
  afterEach(() => {
    jest.clearAllMocks();
    mockHttpClient.reset();
  });
  describe('start', () => {
    it('should throw an error when tenant is not a string', () => {
      expect(sdk.saml.start).toThrow('"tenant" must be a string');
    });

    it('should throw an error when code is empty', () => {
      expect(() => sdk.saml.start('')).toThrow('"tenant" must not be empty');
    });

    it('should return the correct url when "redirect" is set to default (false)', async () => {
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
      const resp = await sdk.saml.start('tenant');
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        apiPaths.saml.start,
        {},
        {
          queryParams: {
            tenant: 'tenant',
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

    it('should redirect the browser to the correct url when "redirect" is set to true', async () => {
      delete window.location;
      window.location = new URL('https://www.example.com');
      mockHttpClient.post.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ url: 'http://redirecturl.com/' }),
        clone: () => ({
          json: () => Promise.resolve({ url: 'http://redirecturl.com/' }),
        }),
      });
      await sdk.saml.start('tenant', undefined, { redirect: true });
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        apiPaths.saml.start,
        {},
        {
          queryParams: {
            tenant: 'tenant',
          },
        }
      );

      expect(window.location.href).toBe('http://redirecturl.com/');
    });

    it('should redirect the browser to the correct url when "redirect" is set to true and login options', async () => {
      delete window.location;
      window.location = new URL('https://www.example.com');
      mockHttpClient.post.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ url: 'http://redirecturl.com/' }),
        clone: () => ({
          json: () => Promise.resolve({ url: 'http://redirecturl.com/' }),
        }),
      });
      await sdk.saml.start(
        'tenant',
        undefined,
        { redirect: true },
        { stepup: true, customClaims: { k1: 'v1' } },
        'token'
      );
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        apiPaths.saml.start,
        { stepup: true, customClaims: { k1: 'v1' } },
        {
          queryParams: {
            tenant: 'tenant',
          },
          token: 'token',
        }
      );

      expect(window.location.href).toBe('http://redirecturl.com/');
    });
  });

  describe('exchange', () => {
    it('should throw an error when code is not a string', () => {
      expect(sdk.saml.exchange).toThrow('"code" must be a string');
    });

    it('should throw an error when code is empty', () => {
      expect(() => sdk.saml.exchange('')).toThrow('"code" must not be empty');
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
      await sdk.saml.exchange('123456');

      expect(mockHttpClient.post).toHaveBeenCalledWith(apiPaths.saml.exchange, {
        code: '123456',
      });
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
      const resp = await sdk.saml.exchange('123456');
      expect(resp).toEqual({
        code: 200,
        data: httpRespJson,
        ok: true,
        response: httpResponse,
      });
    });
  });
});
