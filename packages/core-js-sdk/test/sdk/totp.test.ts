// @ts-nocheck
import { apiPaths } from '../../src/constants';
import createSdk from '../../src/sdk';
import { mockHttpClient } from '../utils';

const sdk = createSdk(mockHttpClient);

describe('totp', () => {
  afterEach(() => {
    jest.clearAllMocks();
    mockHttpClient.reset();
  });
  describe('signUp', () => {
    it('should throw an error when loginId is not a string', () => {
      expect(sdk.totp.signUp).toThrow('"loginId" must be a string');
    });

    it('should throw an error when loginId is empty', () => {
      expect(() => sdk.totp.signUp('')).toThrow('"loginId" must not be empty');
    });

    it('should send the correct request', () => {
      const httpRespJson = { key: 'val' };
      const httpResponse = {
        ok: true,
        json: () => httpRespJson,
        clone: () => ({
          json: () => Promise.resolve(httpRespJson),
        }),
        status: 200,
      };
      mockHttpClient.post.mockResolvedValue(httpResponse);

      sdk.totp.signUp('loginId', { name: 'John Doe' });

      expect(mockHttpClient.post).toHaveBeenCalledWith(apiPaths.totp.signUp, {
        loginId: 'loginId',
        user: { name: 'John Doe' },
      });
    });

    it('should return the correct response', async () => {
      const httpRespJson = { key: 'val' };
      const httpResponse = {
        ok: true,
        json: () => httpRespJson,
        clone: () => ({
          json: () => Promise.resolve(httpRespJson),
        }),
        status: 200,
      };
      mockHttpClient.post.mockResolvedValue(httpResponse);

      const resp = await sdk.totp.signUp('loginId', { name: 'John Doe' });

      expect(resp).toEqual({
        code: 200,
        data: httpRespJson,
        ok: true,
        response: httpResponse,
      });
    });
  });

  describe('verify', () => {
    it('should throw an error when loginId is not a string', () => {
      expect(() => sdk.totp.verify(1, '123456')).toThrow(
        '"loginId" must be a string'
      );
    });

    it('should throw an error when loginId is empty', () => {
      expect(() => sdk.totp.verify('', '123456')).toThrow(
        '"loginId" must not be empty'
      );
    });

    it('should throw an error when code is not a string', () => {
      expect(() => sdk.totp.verify('loginId', 1)).toThrow(
        '"code" must be a string'
      );
    });

    it('should throw an error when code is empty', () => {
      expect(() => sdk.totp.verify('loginId', '')).toThrow(
        '"code" must not be empty'
      );
    });

    it('should send the correct request', () => {
      sdk.totp.verify('loginId', '123456');
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        apiPaths.totp.verify,
        {
          code: '123456',
          loginId: 'loginId',
          loginOptions: undefined,
        },
        { token: undefined }
      );
    });

    it('should send the correct request with login options', () => {
      sdk.totp.verify(
        'loginId',
        '123456',
        { stepup: true, customClaims: { k1: 'v1' } },
        'token'
      );
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        apiPaths.totp.verify,
        {
          code: '123456',
          loginId: 'loginId',
          loginOptions: {
            stepup: true,
            customClaims: { k1: 'v1' },
          },
        },
        { token: 'token' }
      );
    });

    it('should return the correct response', async () => {
      const httpRespJson = { response: 'response' };
      const httpResponse = {
        ok: true,
        json: () => httpRespJson,
        clone: () => ({
          json: () => Promise.resolve(httpRespJson),
        }),
        status: 200,
      };
      mockHttpClient.post.mockResolvedValue(httpResponse);
      const resp = await sdk.totp.verify('123456', 'loginId');

      expect(resp).toEqual({
        code: 200,
        data: httpRespJson,
        ok: true,
        response: httpResponse,
      });
    });
  });

  describe('update', () => {
    it('should throw an error when loginId is not a string', () => {
      expect(() => sdk.totp.update(1, '123456')).toThrow(
        '"loginId" must be a string'
      );
    });

    it('should throw an error when loginId is empty', () => {
      expect(() => sdk.totp.update('', '123456')).toThrow(
        '"loginId" must not be empty'
      );
    });

    it('should send the correct request', () => {
      const httpRespJson = { response: 'response' };
      const httpResponse = {
        ok: true,
        json: () => httpRespJson,
        clone: () => ({
          json: () => Promise.resolve(httpRespJson),
        }),
        status: 200,
      };
      mockHttpClient.post.mockResolvedValue(httpResponse);
      sdk.totp.update('loginId', 'token');
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        apiPaths.totp.update,
        {
          loginId: 'loginId',
        },
        { token: 'token' }
      );
    });

    it('should return the correct response', async () => {
      const httpRespJson = { response: 'response' };
      const httpResponse = {
        ok: true,
        json: () => httpRespJson,
        clone: () => ({
          json: () => Promise.resolve(httpRespJson),
        }),
        status: 200,
      };
      mockHttpClient.post.mockResolvedValue(httpResponse);
      const resp = await sdk.totp.update('loginId');

      expect(resp).toEqual({
        code: 200,
        data: httpRespJson,
        ok: true,
        response: httpResponse,
      });
    });
  });
});
