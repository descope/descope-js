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
      const resp = await sdk.saml.start('tenant-ID');
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        apiPaths.saml.start,
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

    it('should return the correct url - sso id', async () => {
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
      const resp = await sdk.saml.start(
        'tenant-ID',
        null,
        null,
        null,
        'some-sso-id',
      );
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        apiPaths.saml.start,
        {},
        {
          queryParams: {
            tenant: 'tenant-ID',
            ssoId: 'some-sso-id',
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

    it('should return the correct url - all params', async () => {
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
      const resp = await sdk.saml.start('tenant-ID', 'aaa', null, 'ccc', 'ddd');
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        apiPaths.saml.start,
        {},
        {
          queryParams: {
            tenant: 'tenant-ID',
            redirectURL: 'aaa',
            ssoId: 'ddd',
          },
          token: 'ccc',
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
