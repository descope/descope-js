import { isConditionalLoginSupported } from '../../src/lib/helpers/webauthn';
import {
  timeoutPromise,
  getChromiumVersion,
} from '../../src/lib/helpers/helpers';

jest.mock('../../src/lib/helpers/helpers', () => ({
  withMemCache: (fn) => fn,
  timeoutPromise: jest.fn(
    () =>
      new Promise((_, rej) => {
        setTimeout(rej, 10000);
      })
  ),
  getChromiumVersion: jest.fn(),
}));

describe('WebAuthn Helper Function', () => {
  const createSpy = jest.fn();
  const getSpy = jest.fn();
  class TestClass {}

  beforeAll(() => {
    // Since we're not running in a browser we have a lot of setup to define the needed constructs
    Object.defineProperty(global.navigator, 'credentials', {
      value: { create: createSpy, get: getSpy },
    });
    Object.defineProperty(global, 'AuthenticatorAttestationResponse', {
      value: TestClass,
    });
    Object.defineProperty(global, 'PublicKeyCredential', { value: TestClass });
  });

  afterAll(() => {
    jest.resetAllMocks();
  });

  describe('isConditionalLoginSupported', () => {
    it('should return the correct value when browser does not support webauthn', async () => {
      expect(isConditionalLoginSupported()).resolves.toBe(false);
    });

    it('should return the correct value when browser supports webauthn', async () => {
      (<any>window.PublicKeyCredential).isConditionalMediationAvailable =
        jest.fn(() => true);
      (<any>(
        window.PublicKeyCredential
      )).isUserVerifyingPlatformAuthenticatorAvailable = jest.fn(() => true);
      const res = await isConditionalLoginSupported();
      expect(res).toBe(true);
    });

    it('should not hang and return true when isConditionalMediationAvailable is not resolved and Chromium version supports passkeys', async () => {
      (timeoutPromise as jest.Mock).mockImplementationOnce(
        () =>
          new Promise((_, rej) => {
            setTimeout(rej, 100);
          })
      );
      getChromiumVersion.mockReturnValueOnce(110);
      (<any>window.PublicKeyCredential).isConditionalMediationAvailable = () =>
        new Promise(() => {});
      (<any>(
        window.PublicKeyCredential
      )).isUserVerifyingPlatformAuthenticatorAvailable = jest.fn(() => true);
      const res = await isConditionalLoginSupported();
      expect(res).toBe(true);
    });

    it('should not hang and return false when isConditionalMediationAvailable is not resolved and Chromium version does not support passkeys', async () => {
      (timeoutPromise as jest.Mock).mockImplementationOnce(
        () =>
          new Promise((_, rej) => {
            setTimeout(rej, 100);
          })
      );
      getChromiumVersion.mockReturnValueOnce(100);
      (<any>window.PublicKeyCredential).isConditionalMediationAvailable = () =>
        new Promise(() => {});
      (<any>(
        window.PublicKeyCredential
      )).isUserVerifyingPlatformAuthenticatorAvailable = jest.fn(() => true);
      const res = await isConditionalLoginSupported();
      expect(res).toBe(false);
    });

    it('should not throw when browser function rejects', async () => {
      (<any>window.PublicKeyCredential).isConditionalMediationAvailable =
        jest.fn(async () => {
          throw Error();
        });
      (<any>(
        window.PublicKeyCredential
      )).isUserVerifyingPlatformAuthenticatorAvailable = jest.fn(() => true);
      const res = isConditionalLoginSupported();
      expect(res).resolves.toBe(false);
    });
  });
});
