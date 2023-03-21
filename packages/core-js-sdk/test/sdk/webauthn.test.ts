// @ts-nocheck
import { apiPaths } from '../../src/constants';
import createSdk from '../../src/sdk';
import { mockHttpClient } from '../utils';

const sdk = createSdk(mockHttpClient);

describe('webauthn', () => {
  afterEach(() => {
    jest.clearAllMocks();
    mockHttpClient.reset();
  });
  describe('signUp', () => {
    describe('start', () => {
      it('should throw an error when loginId is not a string', () => {
        expect(sdk.webauthn.signUp.start).toThrow('"loginId" must be a string');
      });

      it('should throw an error when loginId is empty', () => {
        expect(() => sdk.webauthn.signUp.start('', 'origin', 'name')).toThrow(
          '"loginId" must not be empty'
        );
      });

      it('should throw an error when origin is not a string', () => {
        expect(() => sdk.webauthn.signUp.start('loginId')).toThrow(
          '"origin" must be a string'
        );
      });

      it('should throw an error when origin is empty', () => {
        expect(() => sdk.webauthn.signUp.start('loginId', '')).toThrow(
          '"origin" must not be empty'
        );
      });

      it('should throw an error when name is not a string', () => {
        expect(() => sdk.webauthn.signUp.start('loginId', 'origin')).toThrow(
          '"name" must be a string'
        );
      });

      it('should throw an error when name is empty', () => {
        expect(() =>
          sdk.webauthn.signUp.start('loginId', 'origin', '')
        ).toThrow('"name" must not be empty');
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

        sdk.webauthn.signUp.start('loginId', 'origin', 'John Doe');

        expect(mockHttpClient.post).toHaveBeenCalledWith(
          apiPaths.webauthn.signUp.start,
          {
            user: { loginId: 'loginId', name: 'John Doe' },
            origin: 'origin',
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

        const resp = await sdk.webauthn.signUp.start(
          'loginId',
          'origin',
          'John Doe'
        );

        expect(resp).toEqual({
          code: 200,
          data: httpRespJson,
          ok: true,
          response: httpResponse,
        });
      });
    });

    describe('finish', () => {
      it('should throw an error when transactionId is not a string', () => {
        expect(sdk.webauthn.signUp.finish).toThrow(
          '"transactionId" must be a string'
        );
      });

      it('should throw an error when transactionId is empty', () => {
        expect(() => sdk.webauthn.signUp.finish('')).toThrow(
          '"transactionId" must not be empty'
        );
      });

      it('should throw an error when response is not a string', () => {
        expect(() => sdk.webauthn.signUp.finish('transactionId')).toThrow(
          '"response" must be a string'
        );
      });

      it('should throw an error when response is empty', () => {
        expect(() => sdk.webauthn.signUp.finish('transactionId', '')).toThrow(
          '"response" must not be empty'
        );
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

        sdk.webauthn.signUp.finish('transactionId', 'response');

        expect(mockHttpClient.post).toHaveBeenCalledWith(
          apiPaths.webauthn.signUp.finish,
          {
            transactionId: 'transactionId',
            response: 'response',
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

        const resp = await sdk.webauthn.signUp.finish(
          'transactionId',
          'response'
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

  describe('signIn', () => {
    describe('start', () => {
      it('should throw an error when loginId is not a string', () => {
        expect(sdk.webauthn.signIn.start).toThrow('"loginId" must be a string');
      });

      it('should not throw an error when loginId is empty', () => {
        expect(() => sdk.webauthn.signIn.start('', 'origin')).not.toThrow();
      });

      it('should throw an error when origin is not a string', () => {
        expect(() => sdk.webauthn.signIn.start('loginId')).toThrow(
          '"origin" must be a string'
        );
      });

      it('should throw an error when origin is empty', () => {
        expect(() => sdk.webauthn.signIn.start('loginId', '')).toThrow(
          '"origin" must not be empty'
        );
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

        sdk.webauthn.signIn.start('loginId', 'origin');

        expect(mockHttpClient.post).toHaveBeenCalledWith(
          apiPaths.webauthn.signIn.start,
          {
            loginId: 'loginId',
            origin: 'origin',
            loginOptions: undefined,
          },
          { token: undefined }
        );
      });

      it('should send the correct request with login options', () => {
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

        sdk.webauthn.signIn.start(
          'loginId',
          'origin',
          { stepup: true, customClaims: { k1: 'v1' } },
          'token'
        );

        expect(mockHttpClient.post).toHaveBeenCalledWith(
          apiPaths.webauthn.signIn.start,
          {
            loginId: 'loginId',
            origin: 'origin',
            loginOptions: { stepup: true, customClaims: { k1: 'v1' } },
          },
          { token: 'token' }
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

        const resp = await sdk.webauthn.signIn.start('loginId', 'origin');

        expect(resp).toEqual({
          code: 200,
          data: httpRespJson,
          ok: true,
          response: httpResponse,
        });
      });
    });

    describe('finish', () => {
      it('should throw an error when transactionId is not a string', () => {
        expect(sdk.webauthn.signUp.finish).toThrow(
          '"transactionId" must be a string'
        );
      });

      it('should throw an error when transactionId is empty', () => {
        expect(() => sdk.webauthn.signUp.finish('')).toThrow(
          '"transactionId" must not be empty'
        );
      });

      it('should throw an error when response is not a string', () => {
        expect(() => sdk.webauthn.signUp.finish('transactionId')).toThrow(
          '"response" must be a string'
        );
      });

      it('should throw an error when response is empty', () => {
        expect(() => sdk.webauthn.signUp.finish('transactionId', '')).toThrow(
          '"response" must not be empty'
        );
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

        sdk.webauthn.signIn.finish('transactionId', 'response');

        expect(mockHttpClient.post).toHaveBeenCalledWith(
          apiPaths.webauthn.signIn.finish,
          {
            transactionId: 'transactionId',
            response: 'response',
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

        const resp = await sdk.webauthn.signIn.finish(
          'transactionId',
          'response'
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

  describe('signUpOrIn', () => {
    describe('start', () => {
      it('should throw an error when loginId is not a string', () => {
        expect(sdk.webauthn.signUpOrIn.start).toThrow(
          '"loginId" must be a string'
        );
      });

      it('should throw an error when loginId is empty', () => {
        expect(() => sdk.webauthn.signUpOrIn.start('', 'origin')).toThrow(
          '"loginId" must not be empty'
        );
      });

      it('should throw an error when origin is not a string', () => {
        expect(() => sdk.webauthn.signUpOrIn.start('loginId')).toThrow(
          '"origin" must be a string'
        );
      });

      it('should throw an error when origin is empty', () => {
        expect(() => sdk.webauthn.signUpOrIn.start('loginId', '')).toThrow(
          '"origin" must not be empty'
        );
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

        sdk.webauthn.signUpOrIn.start('loginId', 'origin');

        expect(mockHttpClient.post).toHaveBeenCalledWith(
          apiPaths.webauthn.signUpOrIn.start,
          {
            loginId: 'loginId',
            origin: 'origin',
          }
        );
      });

      it('should send the correct request with login options', () => {
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

        sdk.webauthn.signUpOrIn.start('loginId', 'origin');

        expect(mockHttpClient.post).toHaveBeenCalledWith(
          apiPaths.webauthn.signUpOrIn.start,
          {
            loginId: 'loginId',
            origin: 'origin',
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

        const resp = await sdk.webauthn.signUpOrIn.start('loginId', 'origin');

        expect(resp).toEqual({
          code: 200,
          data: httpRespJson,
          ok: true,
          response: httpResponse,
        });
      });
    });
  });

  describe('add', () => {
    describe('start', () => {
      it('should throw an error when loginId is not a string', () => {
        expect(sdk.webauthn.update.start).toThrow('"loginId" must be a string');
      });

      it('should throw an error when loginId is empty', () => {
        expect(() => sdk.webauthn.update.start('', 'origin', 'name')).toThrow(
          '"loginId" must not be empty'
        );
      });

      it('should throw an error when origin is not a string', () => {
        expect(() => sdk.webauthn.update.start('loginId')).toThrow(
          '"origin" must be a string'
        );
      });

      it('should throw an error when origin is empty', () => {
        expect(() => sdk.webauthn.update.start('loginId', '')).toThrow(
          '"origin" must not be empty'
        );
      });

      it('should throw an error when token is not a string', () => {
        expect(() => sdk.webauthn.update.start('loginId', 'origin')).toThrow(
          '"token" must be a string'
        );
      });

      it('should throw an error when origin is empty', () => {
        expect(() =>
          sdk.webauthn.update.start('loginId', 'origin', '')
        ).toThrow('"token" must not be empty');
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

        sdk.webauthn.update.start('loginId', 'origin', 'token');

        expect(mockHttpClient.post).toHaveBeenCalledWith(
          apiPaths.webauthn.update.start,
          {
            loginId: 'loginId',
            origin: 'origin',
          },
          { token: 'token' }
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

        const resp = await sdk.webauthn.update.start(
          'loginId',
          'origin',
          'token'
        );

        expect(resp).toEqual({
          code: 200,
          data: httpRespJson,
          ok: true,
          response: httpResponse,
        });
      });
    });

    describe('finish', () => {
      it('should throw an error when transactionId is not a string', () => {
        expect(sdk.webauthn.signUp.finish).toThrow(
          '"transactionId" must be a string'
        );
      });

      it('should throw an error when transactionId is empty', () => {
        expect(() => sdk.webauthn.signUp.finish('')).toThrow(
          '"transactionId" must not be empty'
        );
      });

      it('should throw an error when response is not a string', () => {
        expect(() => sdk.webauthn.signUp.finish('transactionId')).toThrow(
          '"response" must be a string'
        );
      });

      it('should throw an error when response is empty', () => {
        expect(() => sdk.webauthn.signUp.finish('transactionId', '')).toThrow(
          '"response" must not be empty'
        );
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

        sdk.webauthn.update.finish('transactionId', 'response');

        expect(mockHttpClient.post).toHaveBeenCalledWith(
          apiPaths.webauthn.update.finish,
          {
            transactionId: 'transactionId',
            response: 'response',
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

        const resp = await sdk.webauthn.update.finish(
          'transactionId',
          'response'
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
