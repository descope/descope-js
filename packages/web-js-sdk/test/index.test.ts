import createSdk from '../src/index';

const mockFetch = jest.fn().mockReturnValueOnce(new Promise(() => {}));
global.fetch = mockFetch;

describe('sdk', () => {
  it('should return the sdk instance', () => {
    const sdk = createSdk({ projectId: 'pid' });
    expect(sdk).toEqual(
      expect.objectContaining({
        otp: expect.any(Object),
        magicLink: expect.any(Object),
        oauth: expect.any(Object),
        saml: expect.any(Object),
        totp: expect.any(Object),
        webauthn: expect.any(Object),
      })
    );
  });
});
