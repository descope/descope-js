// @ts-nocheck
import { apiPaths } from '../../src/constants';
import createSdk from '../../src/sdk';
import { mockHttpClient } from '../utils';

const sdk = createSdk(mockHttpClient);

describe('otp', () => {
  afterEach(() => {
    jest.clearAllMocks();
    mockHttpClient.reset();
  });
  describe('signUp', () => {
    it('should throw an error when loginId is not a string', () => {
      expect(sdk.otp.signUp.email).toThrow('"loginId" must be a string');
    });

    it('should throw an error when loginId is empty', () => {
      expect(() => sdk.otp.signUp.email('')).toThrow(
        '"loginId" must not be empty'
      );
    });

    it('should send the correct request', () => {
      sdk.otp.signUp.email('loginId', { name: 'John Doe' });
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        apiPaths.otp.signUp + '/email',
        {
          loginId: 'loginId',
          user: { name: 'John Doe' },
        }
      );
    });

    it('should return the correct response', async () => {
      const maskedEmail = 'mm**@m.com';
      const httpRespJson = { key: 'val', maskedEmail: maskedEmail };
      const httpResponse = {
        ok: true,
        json: () => httpRespJson,
        clone: () => ({
          json: () => Promise.resolve(httpRespJson),
        }),
        status: 200,
      };
      mockHttpClient.post.mockResolvedValue(httpResponse);
      const resp = await sdk.otp.signUp.email('loginId', { name: 'John Doe' });
      expect(resp.data.maskedEmail).toEqual(maskedEmail);
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
      expect(sdk.otp.signUp.email).toThrow('"loginId" must be a string');
    });

    it('should throw an error when loginId is empty', () => {
      expect(() => sdk.otp.signUp.email('')).toThrow(
        '"loginId" must not be empty'
      );
    });

    it('should send the correct request', () => {
      sdk.otp.signIn.email('loginId');
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        apiPaths.otp.signIn + '/email',
        {
          loginId: 'loginId',
          loginOptions: undefined,
        },
        { token: undefined }
      );
    });

    it('should send the correct request with login options', () => {
      sdk.otp.signIn.email(
        'loginId',
        { stepup: true, customClaims: { k1: 'v1' } },
        'token'
      );
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        apiPaths.otp.signIn + '/email',
        {
          loginId: 'loginId',
          loginOptions: { stepup: true, customClaims: { k1: 'v1' } },
        },
        { token: 'token' }
      );
    });

    it('should return the correct response', async () => {
      const httpRespJson = { key: 'val', maskedEmail: 'a' };
      const httpResponse = {
        ok: true,
        json: () => httpRespJson,
        clone: () => ({
          json: () => Promise.resolve(httpRespJson),
        }),
        status: 200,
      };
      mockHttpClient.post.mockResolvedValue(httpResponse);
      const resp = await sdk.otp.signIn.email('loginId');
      expect(resp.data.maskedEmail).toEqual('a');
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
      expect(sdk.otp.signUpOrIn.email).toThrow('"loginId" must be a string');
    });

    it('should throw an error when loginId is empty', () => {
      expect(() => sdk.otp.signUpOrIn.email('')).toThrow(
        '"loginId" must not be empty'
      );
    });

    it('should send the correct request', () => {
      sdk.otp.signUpOrIn.email('loginId');
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        apiPaths.otp.signUpOrIn + '/email',
        {
          loginId: 'loginId',
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
      const resp = await sdk.otp.signUpOrIn.email('loginId');

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
      expect(() => sdk.otp.verify.email(1, '123456')).toThrow(
        '"loginId" must be a string'
      );
    });

    it('should throw an error when loginId is empty', () => {
      expect(() => sdk.otp.verify.email('', '123456')).toThrow(
        '"loginId" must not be empty'
      );
    });

    it('should throw an error when code is not a string', () => {
      expect(() => sdk.otp.verify.email('loginId', 1)).toThrow(
        '"code" must be a string'
      );
    });

    it('should throw an error when code is empty', () => {
      expect(() => sdk.otp.verify.email('loginId', '')).toThrow(
        '"code" must not be empty'
      );
    });

    it('should send the correct request', () => {
      sdk.otp.verify.email('loginId', '123456');
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        apiPaths.otp.verify + '/email',
        {
          code: '123456',
          loginId: 'loginId',
        }
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
      const resp = await sdk.otp.verify.email('123456', 'loginId');

      expect(resp).toEqual({
        code: 200,
        data: httpRespJson,
        ok: true,
        response: httpResponse,
      });
    });
  });

  describe('update', () => {
    describe('email', () => {
      it('should throw an error when loginId is not a string', () => {
        expect(() => sdk.otp.update.email(1, '123456')).toThrow(
          '"loginId" must be a string'
        );
      });

      it('should throw an error when loginId is empty', () => {
        expect(() => sdk.otp.update.email('', '123456')).toThrow(
          '"loginId" must not be empty'
        );
      });

      it('should throw an error when email is not a string', () => {
        expect(() => sdk.otp.update.email('loginId', 1)).toThrow(
          '"email" must be a string'
        );
      });

      it('should throw an error when email is not in emil format', () => {
        expect(() => sdk.otp.update.email('loginId', 'nonEmail')).toThrow(
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
        sdk.otp.update.email('loginId', 'new@email.com', 'token');
        expect(mockHttpClient.post).toHaveBeenCalledWith(
          apiPaths.otp.update.email,
          {
            email: 'new@email.com',
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
        const resp = await sdk.otp.update.email('loginId', 'new@email.com');

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
        expect(() => sdk.otp.update.phone.sms(1, '123456')).toThrow(
          '"loginId" must be a string'
        );
      });

      it('should throw an error when loginId is empty', () => {
        expect(() => sdk.otp.update.phone.sms('', '123456')).toThrow(
          '"loginId" must not be empty'
        );
      });

      it('should throw an error when email is not a string', () => {
        expect(() => sdk.otp.update.phone.sms('loginId', 1)).toThrow(
          '"phone" must be a string'
        );
      });

      it('should throw an error when email is not in emil format', () => {
        expect(() => sdk.otp.update.phone.sms('loginId', 'nonPhone')).toThrow(
          '"nonPhone" is not a valid phone number'
        );
      });

      it('should send the correct request', async () => {
        const httpRespJson = { response: 'response', maskedPhone: '**99' };
        const httpResponse = {
          ok: true,
          json: () => httpRespJson,
          clone: () => ({
            json: () => Promise.resolve(httpRespJson),
          }),
          status: 200,
        };
        mockHttpClient.post.mockResolvedValue(httpResponse);
        const resp = await sdk.otp.update.phone.sms(
          'loginId',
          '+9720000000',
          'token'
        );
        expect(resp.data.maskedPhone).toEqual('**99');
        expect(mockHttpClient.post).toHaveBeenCalledWith(
          apiPaths.otp.update.phone + '/sms',
          {
            phone: '+9720000000',
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
        const resp = await sdk.otp.update.phone.sms('loginId', '+9720000000');

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
