// @ts-nocheck
import { apiPaths } from '../../src/constants';
import createSdk from '../../src/sdk';
import { mockHttpClient } from '../utils';

const sdk = createSdk(mockHttpClient);
describe('Magic Link', () => {
  afterEach(() => {
    jest.clearAllMocks();
    mockHttpClient.reset();
  });
  describe('signUp', () => {
    it('should throw an error when loginId is not a string', () => {
      expect(() => sdk.magicLink.signUp.email(undefined)).toThrow(
        '"loginId" must be a string'
      );
    });

    it('should throw an error when loginId is empty', () => {
      expect(() => sdk.magicLink.signUp.email('')).toThrow(
        '"loginId" must not be empty'
      );
    });

    it('should send the correct request', () => {
      sdk.magicLink.signUp.email('loginId', 'http://some.thing.com', {
        name: 'John Doe',
      });
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        apiPaths.magicLink.signUp + '/email',
        {
          loginId: 'loginId',
          URI: 'http://some.thing.com',
          user: { name: 'John Doe' },
        }
      );
    });
  });
  describe('signIn', () => {
    it('should throw an error when loginId is not a string', () => {
      expect(() => sdk.magicLink.signUp.email(undefined)).toThrow(
        '"loginId" must be a string'
      );
    });

    it('should send the correct request', () => {
      sdk.magicLink.signIn.email('loginId', 'http://some.thing.com');
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        apiPaths.magicLink.signIn + '/email',
        {
          loginId: 'loginId',
          URI: 'http://some.thing.com',
          loginOptions: undefined,
        },
        { token: undefined }
      );
    });

    it('should send the correct request with login options', () => {
      sdk.magicLink.signIn.email(
        'loginId',
        'http://some.thing.com',
        {
          stepup: true,
          customClaims: { k1: 'v1' },
        },
        'token'
      );
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        apiPaths.magicLink.signIn + '/email',
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

    it('should send the correct request with login options of mfa', () => {
      sdk.magicLink.signIn.email(
        'loginId',
        'http://some.thing.com',
        {
          mfa: true,
          customClaims: { k1: 'v1' },
        },
        'token'
      );
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        apiPaths.magicLink.signIn + '/email',
        {
          loginId: 'loginId',
          URI: 'http://some.thing.com',
          loginOptions: {
            mfa: true,
            customClaims: { k1: 'v1' },
          },
        },
        { token: 'token' }
      );
    });

    it('should send the correct request with login options of custom claims only', () => {
      sdk.magicLink.signIn.email(
        'loginId',
        'http://some.thing.com',
        {
          customClaims: { k1: 'v1' },
        },
        'token'
      );
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        apiPaths.magicLink.signIn + '/email',
        {
          loginId: 'loginId',
          URI: 'http://some.thing.com',
          loginOptions: {
            customClaims: { k1: 'v1' },
          },
        },
        { token: 'token' }
      );
    });
  });

  describe('signUpOrIn', () => {
    it('should throw an error when loginId is not a string', () => {
      expect(() => sdk.magicLink.signUpOrIn.email(undefined)).toThrow(
        '"loginId" must be a string'
      );
    });

    it('should throw an error when loginId is empty', () => {
      expect(() => sdk.magicLink.signUpOrIn.email('')).toThrow(
        '"loginId" must not be empty'
      );
    });

    it('should send the correct request', () => {
      sdk.magicLink.signUpOrIn.email('loginId', 'http://some.thing.com');
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        apiPaths.magicLink.signUpOrIn + '/email',
        {
          loginId: 'loginId',
          URI: 'http://some.thing.com',
        }
      );
    });
  });

  describe('verify', () => {
    it('should throw an error when token is not a string', () => {
      expect(sdk.magicLink.verify).toThrow('"token" must be a string');
    });

    it('should throw an error when token is empty', () => {
      expect(() => sdk.magicLink.verify('')).toThrow(
        '"token" must not be empty'
      );
    });

    it('should send the correct request', () => {
      sdk.magicLink.verify('token');
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        apiPaths.magicLink.verify,
        {
          token: 'token',
        }
      );
    });
  });

  describe('update', () => {
    describe('email', () => {
      it('should throw an error when loginId is not a string', () => {
        expect(() => sdk.magicLink.update.email(1, '123456')).toThrow(
          '"loginId" must be a string'
        );
      });

      it('should throw an error when loginId is empty', () => {
        expect(() => sdk.magicLink.update.email('', '123456')).toThrow(
          '"loginId" must not be empty'
        );
      });

      it('should throw an error when email is not a string', () => {
        expect(() => sdk.magicLink.update.email('loginId', 1)).toThrow(
          '"email" must be a string'
        );
      });

      it('should throw an error when email is not in email format', () => {
        expect(() => sdk.magicLink.update.email('loginId', 'nonEmail')).toThrow(
          '"nonEmail" is not a valid email'
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
        sdk.magicLink.update.email(
          'loginId',
          'new@email.com',
          'new@email.com',
          'token'
        );
        expect(mockHttpClient.post).toHaveBeenCalledWith(
          apiPaths.magicLink.update.email,
          {
            email: 'new@email.com',
            loginId: 'loginId',
            URI: 'new@email.com',
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
        const resp = await sdk.magicLink.update.email(
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

    describe('phone', () => {
      it('should throw an error when loginId is not a string', () => {
        expect(() => sdk.magicLink.update.phone.sms(1, '123456')).toThrow(
          '"loginId" must be a string'
        );
      });

      it('should throw an error when loginId is empty', () => {
        expect(() => sdk.magicLink.update.phone.sms('', '123456')).toThrow(
          '"loginId" must not be empty'
        );
      });

      it('should throw an error when phone is not a string', () => {
        expect(() => sdk.magicLink.update.phone.sms('loginId', 1)).toThrow(
          '"phone" must be a string'
        );
      });

      it('should throw an error when phone is not in phone format', () => {
        expect(() =>
          sdk.magicLink.update.phone.sms('loginId', 'nonPhone')
        ).toThrow('"nonPhone" is not a valid phone number');
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
        sdk.magicLink.update.phone.sms(
          'loginId',
          '+9720000000',
          'http://some.thing.com',
          'token'
        );
        expect(mockHttpClient.post).toHaveBeenCalledWith(
          apiPaths.magicLink.update.phone + '/sms',
          {
            phone: '+9720000000',
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
        const resp = await sdk.magicLink.update.phone.sms(
          'loginId',
          '+9720000000',
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
  });
});
