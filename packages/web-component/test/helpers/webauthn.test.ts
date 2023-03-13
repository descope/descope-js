import { isConditionalLoginSupported } from '../../src/lib/helpers/webauthn';

jest.mock('../../src/lib/helpers/helpers', () => ({
  withMemCache: (fn) => fn,
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
      const res = isConditionalLoginSupported();
      expect(res).resolves.toBe(true);
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
