import { isConditionalLoginSupported } from '../../src/lib/helpers/webauthn';

jest.mock('../../src/lib/helpers/helpers', () => {
  const helpers = jest.requireActual('../../src/lib/helpers/helpers');
  return {
    ...helpers,
    withMemCache: jest.fn((fn) => fn),
  };
});

describe('WebAuthn Helper Function', () => {
  const createSpy = jest.fn();
  const getSpy = jest.fn();
  class TestClass {}
  const browserBrand = { brand: 'Chromium', version: '' };

  const hangingPromiseFunction = () =>
    new Promise((resolve) => {
      setTimeout(() => resolve(true), 500);
    });

  beforeAll(() => {
    // Since we're not running in a browser we have a lot of setup to define the needed constructs
    Object.defineProperty(global.navigator, 'credentials', {
      value: { create: createSpy, get: getSpy },
    });
    Object.defineProperty(global.navigator, 'userAgentData', {
      value: { brands: [browserBrand] },
    });
    Object.defineProperty(global, 'AuthenticatorAttestationResponse', {
      value: TestClass,
    });
    Object.defineProperty(global, 'PublicKeyCredential', { value: TestClass });
  });

  beforeEach(() => {
    browserBrand.version = '110';
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
      (<any>window.PublicKeyCredential).isConditionalMediationAvailable =
        hangingPromiseFunction;
      (<any>(
        window.PublicKeyCredential
      )).isUserVerifyingPlatformAuthenticatorAvailable = jest.fn(() => true);
      const res = await isConditionalLoginSupported();
      expect(res).toBe(true);
    });

    it('should not hang and return false when isConditionalMediationAvailable is not resolved and Chromium version does not support passkeys', async () => {
      browserBrand.version = '100';
      (<any>window.PublicKeyCredential).isConditionalMediationAvailable =
        hangingPromiseFunction;
      (<any>(
        window.PublicKeyCredential
      )).isUserVerifyingPlatformAuthenticatorAvailable = jest.fn(() => true);
      const res = await isConditionalLoginSupported();
      expect(res).toBe(false);
    });

    it('should not throw and return false when browser function rejects', async () => {
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
