// @ts-nocheck
import {
  apiPaths,
  MAX_POLLING_TIMEOUT_MS,
  MIN_POLLING_INTERVAL_MS,
} from '../../src/constants';
import createSdk from '../../src/sdk';
import { mockHttpClient } from '../utils';

const sdk = createSdk(mockHttpClient);
describe('NOTP', () => {
  afterEach(() => {
    jest.clearAllMocks();
    mockHttpClient.reset();
  });

  describe('signUp', () => {
    it('should send the correct request', () => {
      sdk.notp.signUp('loginId', {
        name: 'John Doe',
      });
      expect(mockHttpClient.post).toHaveBeenCalledWith(apiPaths.notp.signUp, {
        loginId: 'loginId',
        user: { name: 'John Doe' },
      });
    });

    it('should send the correct request with sign up options', () => {
      sdk.notp.signUp(
        '',
        {
          name: 'John Doe',
        },
        {
          templateOptions: {
            ble: 'blue',
          },
        },
      );
      expect(mockHttpClient.post).toHaveBeenCalledWith(apiPaths.notp.signUp, {
        loginId: '',
        user: { name: 'John Doe' },
        loginOptions: {
          templateOptions: {
            ble: 'blue',
          },
        },
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
      const resp = await sdk.notp.signUp('loginId', {
        name: 'John Doe',
      });

      expect(resp).toEqual({
        code: 200,
        data: httpRespJson,
        ok: true,
        response: httpResponse,
      });
    });
  });
  describe('signIn', () => {
    it('should send the correct request', () => {
      sdk.notp.signIn('loginId');
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        apiPaths.notp.signIn,
        {
          loginId: 'loginId',
          loginOptions: undefined,
        },
        { token: undefined },
      );
    });

    it('should send the correct request with login options', () => {
      sdk.notp.signIn(
        '',
        {
          stepup: true,
          customClaims: { k1: 'v1' },
        },
        'token',
      );
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        apiPaths.notp.signIn,
        {
          loginId: '',
          loginOptions: {
            stepup: true,
            customClaims: { k1: 'v1' },
          },
        },
        { token: 'token' },
      );
    });

    it('should return the correct response', async () => {
      const httpRespJson = { bla: 'bla' };
      const httpResponse = {
        ok: true,
        json: () => httpRespJson,
        clone: () => ({
          json: () => Promise.resolve(httpRespJson),
        }),
        status: 200,
      };
      mockHttpClient.post.mockResolvedValue(httpResponse);
      const resp = await sdk.notp.signIn('loginId');

      expect(resp).toEqual({
        code: 200,
        data: httpRespJson,
        ok: true,
        response: httpResponse,
      });
    });
  });

  describe('signUpOrIn', () => {
    it('should send the correct request', () => {
      sdk.notp.signUpOrIn('loginId');
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        apiPaths.notp.signUpOrIn,
        {
          loginId: 'loginId',
        },
      );
    });

    it('should send the correct request with sign up options', () => {
      sdk.notp.signUpOrIn('', {
        templateOptions: {
          ble: 'blue',
        },
      });
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        apiPaths.notp.signUpOrIn,
        {
          loginId: '',
          loginOptions: {
            templateOptions: {
              ble: 'blue',
            },
          },
        },
      );
    });

    it('should return the correct response', async () => {
      const httpRespJson = { bla: 'bla' };
      const httpResponse = {
        ok: true,
        json: () => httpRespJson,
        clone: () => ({
          json: () => Promise.resolve(httpRespJson),
        }),
        status: 200,
      };
      mockHttpClient.post.mockResolvedValue(httpResponse);
      const resp = await sdk.notp.signUpOrIn('loginId');

      expect(resp).toEqual({
        code: 200,
        data: httpRespJson,
        ok: true,
        response: httpResponse,
      });
    });
  });

  describe('waitForSession', () => {
    it('should throw an error when pendingRef is not a string', () => {
      expect(sdk.notp.waitForSession).toThrow('"pendingRef" must be a string');
    });

    it('should throw an error when pendingRef is empty', () => {
      expect(() => sdk.notp.waitForSession('')).toThrow(
        '"pendingRef" must not be empty',
      );
    });

    it('should normalize the polling interval timeout', () => {
      const timeoutSpy = jest.spyOn(global, 'setTimeout');
      sdk.notp.waitForSession('123456', { timeoutMs: 9999999999 });
      expect(timeoutSpy).toHaveBeenCalledWith(
        expect.any(Function),
        MAX_POLLING_TIMEOUT_MS,
      );
    });

    it('should normalize the polling interval', () => {
      const timeoutSpy = jest.spyOn(global, 'setInterval');
      sdk.notp.waitForSession('123456', { timeoutMs: 0 });
      expect(timeoutSpy).toHaveBeenCalledWith(
        expect.any(Function),
        MIN_POLLING_INTERVAL_MS,
      );
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
      const resp = await sdk.notp.waitForSession('pendingRef');
      expect(resp).toEqual({
        code: 200,
        data: httpRespJson,
        ok: true,
        response: httpResponse,
      });
    });

    it('should send the correct request', async () => {
      mockHttpClient.post.mockResolvedValue({
        ok: true,
        json: () => ({ key: 'val' }),
        clone: () => ({
          json: () => Promise.resolve({ key: 'val' }),
        }),
      });
      await sdk.notp.waitForSession('pendingRef');
      expect(mockHttpClient.post).toHaveBeenCalledWith(apiPaths.notp.session, {
        pendingRef: 'pendingRef',
      });
    });

    it('should send multiple requests until received a ok response', async () => {
      mockHttpClient.post.mockResolvedValueOnce({ ok: false });
      mockHttpClient.post.mockResolvedValueOnce({ ok: false });
      mockHttpClient.post.mockResolvedValueOnce({
        ok: true,
        json: () => ({ key: 'val' }),
        clone: () => ({
          json: () => Promise.resolve({ key: 'val' }),
        }),
      });

      await sdk.notp.waitForSession('pendingRef');
      expect(mockHttpClient.post).toHaveBeenCalledTimes(3);
    }, 5000);

    it('should return error response when timeout exceeded', async () => {
      mockHttpClient.post.mockResolvedValue({ ok: false });

      jest.spyOn(global, 'setTimeout').mockImplementationOnce((cb) => cb());

      const resp = await sdk.notp.waitForSession('pendingRef');

      expect(resp).toEqual({
        error: {
          errorDescription: expect.any(String),
          errorCode: '0',
        },
        ok: false,
      });
    }, 5000);
  });
});
