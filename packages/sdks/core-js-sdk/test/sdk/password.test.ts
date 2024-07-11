// @ts-nocheck
import { apiPaths } from '../../src/constants';
import createSdk from '../../src/sdk';
import { mockHttpClient } from '../utils';

const sdk = createSdk(mockHttpClient);

describe('password', () => {
  afterEach(() => {
    jest.clearAllMocks();
    mockHttpClient.reset();
  });
  describe('signUp', () => {
    it('should throw an error when loginId is not a string', () => {
      expect(sdk.password.signUp).toThrow('"loginId" must be a string');
    });

    it('should throw an error when loginId is empty', () => {
      expect(() => sdk.password.signUp('')).toThrow(
        '"loginId" must not be empty',
      );
    });

    it('should throw an error when password is not a string', () => {
      expect(() => sdk.password.signUp('loginId')).toThrow(
        '"password" must be a string',
      );
    });

    it('should throw an error when password is empty', () => {
      expect(() => sdk.password.signUp('loginId', '')).toThrow(
        '"password" must not be empty',
      );
    });

    it('should send the correct request and response', async () => {
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

      const resp = await sdk.password.signUp(
        'loginId',
        'abcd1234',
        {
          name: 'John Doe',
        },
        {
          customClaims: {
            claim1: 'yes',
          },
        },
      );

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        apiPaths.password.signUp,
        {
          loginId: 'loginId',
          password: 'abcd1234',
          user: { name: 'John Doe' },
          loginOptions: {
            customClaims: {
              claim1: 'yes',
            },
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

  describe('signIn', () => {
    it('should throw an error when loginId is not a string', () => {
      expect(sdk.password.signIn).toThrow('"loginId" must be a string');
    });

    it('should throw an error when loginId is empty', () => {
      expect(() => sdk.password.signIn('')).toThrow(
        '"loginId" must not be empty',
      );
    });

    it('should throw an error when password is not a string', () => {
      expect(() => sdk.password.signIn('loginId')).toThrow(
        '"password" must be a string',
      );
    });

    it('should throw an error when password is empty', () => {
      expect(() => sdk.password.signIn('loginId', '')).toThrow(
        '"password" must not be empty',
      );
    });

    it('should send the correct request and response', async () => {
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

      const resp = await sdk.password.signIn('loginId', 'abcd1234', {
        customClaims: {
          claim1: 'yes',
        },
      });

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        apiPaths.password.signIn,
        {
          loginId: 'loginId',
          password: 'abcd1234',
          loginOptions: {
            customClaims: {
              claim1: 'yes',
            },
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

  describe('sendReset', () => {
    it('should throw an error when loginId is not a string', () => {
      expect(sdk.password.sendReset).toThrow('"loginId" must be a string');
    });

    it('should throw an error when loginId is empty', () => {
      expect(() => sdk.password.sendReset('')).toThrow(
        '"loginId" must not be empty',
      );
    });

    it('should send the correct request and response', async () => {
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

      const resp = await sdk.password.sendReset('loginId');

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        apiPaths.password.sendReset,
        {
          loginId: 'loginId',
        },
      );

      expect(resp).toEqual({
        code: 200,
        data: httpRespJson,
        ok: true,
        response: httpResponse,
      });
    });

    it('should send the correct request and response with template options', async () => {
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

      const resp = await sdk.password.sendReset('loginId', 'kuku', {
        ble: 'blue',
      });

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        apiPaths.password.sendReset,
        {
          loginId: 'loginId',
          redirectUrl: 'kuku',
          templateOptions: {
            ble: 'blue',
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

  describe('update', () => {
    it('should throw an error when loginId is not a string', () => {
      expect(sdk.password.update).toThrow('"loginId" must be a string');
    });

    it('should throw an error when loginId is empty', () => {
      expect(() => sdk.password.update('')).toThrow(
        '"loginId" must not be empty',
      );
    });

    it('should throw an error when newPassword is not a string', () => {
      expect(() => sdk.password.update('loginId')).toThrow(
        '"newPassword" must be a string',
      );
    });

    it('should throw an error when newPassword is empty', () => {
      expect(() => sdk.password.update('loginId', '')).toThrow(
        '"newPassword" must not be empty',
      );
    });

    it('should send the correct request', async () => {
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
      const resp = await sdk.password.update('loginId', 'abcd1234', 'token');
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        apiPaths.password.update,
        {
          loginId: 'loginId',
          newPassword: 'abcd1234',
        },
        { token: 'token' },
      );

      expect(resp).toEqual({
        code: 200,
        data: httpRespJson,
        ok: true,
        response: httpResponse,
      });
    });
  });

  describe('replace', () => {
    it('should throw an error when loginId is not a string', () => {
      expect(sdk.password.replace).toThrow('"loginId" must be a string');
    });

    it('should throw an error when loginId is empty', () => {
      expect(() => sdk.password.replace('')).toThrow(
        '"loginId" must not be empty',
      );
    });

    it('should throw an error when oldPassword is not a string', () => {
      expect(() => sdk.password.replace('loginId')).toThrow(
        '"oldPassword" must be a string',
      );
    });

    it('should throw an error when oldPassword is empty', () => {
      expect(() => sdk.password.replace('loginId', '')).toThrow(
        '"oldPassword" must not be empty',
      );
    });

    it('should throw an error when newPassword is not a string', () => {
      expect(() => sdk.password.replace('loginId', 'oldPassword')).toThrow(
        '"newPassword" must be a string',
      );
    });

    it('should throw an error when newPassword is empty', () => {
      expect(() => sdk.password.replace('loginId', 'oldPassword', '')).toThrow(
        '"newPassword" must not be empty',
      );
    });

    it('should send the correct request', async () => {
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
      const resp = await sdk.password.replace(
        'loginId',
        'abcd1234',
        'abcd12345',
      );
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        apiPaths.password.replace,
        {
          loginId: 'loginId',
          oldPassword: 'abcd1234',
          newPassword: 'abcd12345',
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

  describe('policy', () => {
    it('should send the correct request and response', async () => {
      const httpRespJson = { minLength: 9, lowercase: true };
      const httpResponse = {
        ok: true,
        json: () => httpRespJson,
        clone: () => ({
          json: () => Promise.resolve(httpRespJson),
        }),
        status: 200,
      };
      mockHttpClient.get.mockResolvedValue(httpResponse);

      const resp = await sdk.password.policy();

      expect(mockHttpClient.get).toHaveBeenCalledWith(apiPaths.password.policy);

      expect(resp).toEqual({
        code: 200,
        data: httpRespJson,
        ok: true,
        response: httpResponse,
      });
    });
  });
});
