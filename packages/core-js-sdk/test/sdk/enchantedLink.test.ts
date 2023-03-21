// @ts-nocheck
import {
  apiPaths,
  ENCHANTED_LINK_MAX_POLLING_TIMEOUT_MS,
  ENCHANTED_LINK_MIN_POLLING_INTERVAL_MS,
} from '../../src/constants';
import createSdk from '../../src/sdk';
import { mockHttpClient } from '../utils';

const sdk = createSdk(mockHttpClient);
describe('Enchanted Link', () => {
  afterEach(() => {
    jest.clearAllMocks();
    mockHttpClient.reset();
  });

  describe('signUp', () => {
    it('should throw an error when loginId is not a string', () => {
      expect(() => sdk.enchantedLink.signUp(undefined)).toThrow(
        '"loginId" must be a string'
      );
    });

    it('should throw an error when loginId is empty', () => {
      expect(() => sdk.enchantedLink.signUp('')).toThrow(
        '"loginId" must not be empty'
      );
    });

    it('should send the correct request', () => {
      sdk.enchantedLink.signUp('loginId', 'http://some.thing.com', {
        name: 'John Doe',
      });
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        apiPaths.enchantedLink.signUp + '/email',
        {
          loginId: 'loginId',
          URI: 'http://some.thing.com',
          user: { name: 'John Doe' },
        }
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
      const resp = await sdk.enchantedLink.signUp(
        'loginId',
        'http://some.thing.com',
        {
          name: 'John Doe',
        }
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
      expect(() =>
        sdk.enchantedLink.signUp(undefined, 'http://some.thing.com')
      ).toThrow('"loginId" must be a string');
    });

    it('should throw an error when loginId is empty', () => {
      expect(() =>
        sdk.enchantedLink.signUp('', 'http://some.thing.com')
      ).toThrow('"loginId" must not be empty');
    });

    it('should send the correct request', () => {
      sdk.enchantedLink.signIn('loginId', 'http://some.thing.com');
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        apiPaths.enchantedLink.signIn + '/email',
        {
          loginId: 'loginId',
          URI: 'http://some.thing.com',
          loginOptions: undefined,
        },
        { token: undefined }
      );
    });

    it('should send the correct request with login options', () => {
      sdk.enchantedLink.signIn(
        'loginId',
        'http://some.thing.com',
        {
          stepup: true,
          customClaims: { k1: 'v1' },
        },
        'token'
      );
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        apiPaths.enchantedLink.signIn + '/email',
        {
          loginId: 'loginId',
          URI: 'http://some.thing.com',
          loginOptions: {
            stepup: true,
            customClaims: { k1: 'v1' },
          },
        },
        { token: 'token' }
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
      const resp = await sdk.enchantedLink.signIn(
        'loginId',
        'http://some.thing.com'
      );

      expect(resp).toEqual({
        code: 200,
        data: httpRespJson,
        ok: true,
        response: httpResponse,
      });
    });
  });

  describe('signUpOrIn', () => {
    it('should throw an error when loginId is not a string', () => {
      expect(() =>
        sdk.enchantedLink.signUpOrIn(undefined, 'http://some.thing.com')
      ).toThrow('"loginId" must be a string');
    });

    it('should throw an error when loginId is empty', () => {
      expect(() =>
        sdk.enchantedLink.signUpOrIn('', 'http://some.thing.com')
      ).toThrow('"loginId" must not be empty');
    });

    it('should send the correct request', () => {
      sdk.enchantedLink.signUpOrIn('loginId', 'http://some.thing.com');
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        apiPaths.enchantedLink.signUpOrIn + '/email',
        {
          loginId: 'loginId',
          URI: 'http://some.thing.com',
        }
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
      const resp = await sdk.enchantedLink.signUpOrIn(
        'loginId',
        'http://some.thing.com'
      );

      expect(resp).toEqual({
        code: 200,
        data: httpRespJson,
        ok: true,
        response: httpResponse,
      });
    });
  });

  describe('verify', () => {
    it('should throw an error when token is not a string', () => {
      expect(sdk.enchantedLink.verify).toThrow('"token" must be a string');
    });

    it('should throw an error when token is empty', () => {
      expect(() => sdk.enchantedLink.verify('')).toThrow(
        '"token" must not be empty'
      );
    });

    it('should send the correct request', () => {
      sdk.enchantedLink.verify('123456');
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        apiPaths.enchantedLink.verify,
        {
          token: '123456',
        }
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
      const resp = await sdk.enchantedLink.verify('123456');

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
      expect(sdk.enchantedLink.waitForSession).toThrow(
        '"pendingRef" must be a string'
      );
    });

    it('should throw an error when pendingRef is empty', () => {
      expect(() => sdk.enchantedLink.waitForSession('')).toThrow(
        '"pendingRef" must not be empty'
      );
    });

    it('should normalize the polling interval timeout', () => {
      const timeoutSpy = jest.spyOn(global, 'setTimeout');
      sdk.enchantedLink.waitForSession('123456', { timeoutMs: 9999999999 });
      expect(timeoutSpy).toHaveBeenCalledWith(
        expect.any(Function),
        ENCHANTED_LINK_MAX_POLLING_TIMEOUT_MS
      );
    });

    it('should normalize the polling interval', () => {
      const timeoutSpy = jest.spyOn(global, 'setInterval');
      sdk.enchantedLink.waitForSession('123456', { timeoutMs: 0 });
      expect(timeoutSpy).toHaveBeenCalledWith(
        expect.any(Function),
        ENCHANTED_LINK_MIN_POLLING_INTERVAL_MS
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
      const resp = await sdk.enchantedLink.waitForSession('pendingRef');
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
      await sdk.enchantedLink.waitForSession('pendingRef');
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        apiPaths.enchantedLink.session,
        {
          pendingRef: 'pendingRef',
        }
      );
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

      await sdk.enchantedLink.waitForSession('pendingRef');
      expect(mockHttpClient.post).toHaveBeenCalledTimes(3);
    }, 5000);

    it('should return error response when timeout exceeded', async () => {
      mockHttpClient.post.mockResolvedValue({ ok: false });

      jest.spyOn(global, 'setTimeout').mockImplementationOnce((cb) => cb());

      const resp = await sdk.enchantedLink.waitForSession('pendingRef');

      expect(resp).toEqual({
        error: {
          errorDescription: expect.any(String),
          errorCode: '0',
        },
        ok: false,
      });
    }, 5000);
  });

  describe('update', () => {
    describe('email', () => {
      it('should throw an error when loginId is not a string', () => {
        expect(() => sdk.enchantedLink.update.email(1, '123456')).toThrow(
          '"loginId" must be a string'
        );
      });

      it('should throw an error when loginId is empty', () => {
        expect(() => sdk.enchantedLink.update.email('', '123456')).toThrow(
          '"loginId" must not be empty'
        );
      });

      it('should throw an error when email is not a string', () => {
        expect(() => sdk.enchantedLink.update.email('loginId', 1)).toThrow(
          '"email" must be a string'
        );
      });

      it('should throw an error when email is not in email format', () => {
        expect(() =>
          sdk.enchantedLink.update.email('loginId', 'nonEmail')
        ).toThrow('"nonEmail" is not a valid email');
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
        sdk.enchantedLink.update.email(
          'loginId',
          'new@email.com',
          'http://some.thing.com',
          'token'
        );
        expect(mockHttpClient.post).toHaveBeenCalledWith(
          apiPaths.enchantedLink.update.email,
          {
            email: 'new@email.com',
            loginId: 'loginId',
            URI: 'http://some.thing.com',
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
        const resp = await sdk.enchantedLink.update.email(
          'loginId',
          'new@email.com',
          'new@email.com'
        );

        expect(resp).toEqual({
          code: 200,
          data: httpRespJson,
          ok: true,
          response: httpResponse,
        });
      });
    });
  });
});
