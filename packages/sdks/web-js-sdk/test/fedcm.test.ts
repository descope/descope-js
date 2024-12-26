import createSdk from '../src/index';
import webauthn from '../src/sdk/webauthn';

const coreJs = {
  oauth: {
    startNative: jest.fn(),
    finishNative: jest.fn(),
  },
  webauthn: {},
  refresh: jest.fn(),
  httpClient: {
    buildUrl: jest
      .fn()
      .mockReturnValue('http://localhost:3000/P123/fedcm/config'),
  },
};

jest.mock('@descope/core-js-sdk', () => ({
  default: () => coreJs,
  wrapWith: (obj: {}) => obj,
  __esModule: true,
}));

const sdk = createSdk({ projectId: 'P123', baseUrl: 'http://localhost:3000' });

const googleClient = {
  initialize: jest.fn(),
  prompt: jest.fn(),
};

// @ts-ignore
window.google = {
  accounts: {
    id: googleClient,
  },
};

describe('fedcm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('oneTap', () => {
    it('call start native when calling oneTap with provider and login options', () => {
      // mock startNative response to be ok
      coreJs.oauth.startNative.mockResolvedValue({ ok: true, data: {} });
      sdk.fedcm.oneTap('google', { auto_select: true }, { stepup: false });
      expect(coreJs.oauth.startNative).toHaveBeenCalledWith(
        'google',
        { stepup: false },
        true,
      );
    });
    it('throw error when startNative response is not ok', async () => {
      coreJs.oauth.startNative.mockResolvedValue({ ok: false, error: 'error' });
      try {
        await sdk.fedcm.oneTap(
          'google',
          { auto_select: true },
          { stepup: false },
        );
      } catch (e) {
        expect(e).toEqual('error');
      }
    });
    it('call google client initialize with the correct params', async () => {
      coreJs.oauth.startNative.mockResolvedValue({
        ok: true,
        data: { clientId: 'C123', stateId: 'S123', nonce: 'N123' },
      });
      sdk.fedcm.oneTap(
        'google',
        { auto_select: true, itp_support: false, use_fedcm_for_prompt: false },
        { stepup: false },
      );
      await new Promise(process.nextTick);

      expect(googleClient.initialize).toHaveBeenCalledWith({
        auto_select: true,
        itp_support: false,
        use_fedcm_for_prompt: false,
        client_id: 'C123',
        callback: expect.any(Function),
        nonce: 'N123',
      });
    });
    it('call google client prompt the correct defaults', async () => {
      coreJs.oauth.startNative.mockResolvedValue({
        ok: true,
        data: { clientId: 'C123', stateId: 'S123', nonce: 'N123' },
      });
      sdk.fedcm.oneTap('google', { auto_select: true }, { stepup: false });
      await new Promise(process.nextTick);

      expect(googleClient.initialize).toHaveBeenCalledWith({
        auto_select: true,
        itp_support: true,
        use_fedcm_for_prompt: true,
        client_id: 'C123',
        callback: expect.any(Function),
        nonce: 'N123',
      });
    });
    it('call finish native when user signs in with google with state id and the jwt', async () => {
      coreJs.oauth.startNative.mockResolvedValue({
        ok: true,
        data: { clientId: 'C123', stateId: 'S123', nonce: 'N123' },
      });
      sdk.fedcm.oneTap('google', { auto_select: true }, { stepup: false });
      await new Promise(process.nextTick);
      const callback = googleClient.initialize.mock.calls[0][0].callback;
      callback({ credential: 'JWT' });
      expect(coreJs.oauth.finishNative).toHaveBeenCalledWith(
        'google',
        'S123',
        '',
        '',
        'JWT',
      );
    });
    it('call onSkip callback on prompt skip', async () => {
      coreJs.oauth.startNative.mockResolvedValue({
        ok: true,
        data: { clientId: 'C123', stateId: 'S123', nonce: 'N123' },
      });
      const onSkip = jest.fn();
      sdk.fedcm.oneTap(
        'google',
        { auto_select: true },
        { stepup: false },
        onSkip,
      );
      await new Promise(process.nextTick);
      const promptCallback = googleClient.prompt.mock.calls[0][0];
      promptCallback({ isSkippedMoment: () => true });
      expect(onSkip).toHaveBeenCalled();
    });
    it('call onDismissed callback on prompt dismiss with detailed reason', async () => {
      coreJs.oauth.startNative.mockResolvedValue({
        ok: true,
        data: { clientId: 'C123', stateId: 'S123', nonce: 'N123' },
      });

      const onDismissed = jest.fn();

      // Call oneTap with onDismissed callback
      sdk.fedcm.oneTap(
        'google',
        { auto_select: true },
        { stepup: false },
        undefined,
        onDismissed,
      );

      await new Promise(process.nextTick);

      // Simulate prompt callback with isDismissedMoment and getDismissedReason
      const promptCallback = googleClient.prompt.mock.calls[0][0];
      promptCallback({
        isDismissedMoment: () => true,
        getDismissedReason: () => 'credential_returned',
      });

      expect(onDismissed).toHaveBeenCalledWith('credential_returned');
    });
  });
  describe('launch', () => {
    it('should call navigator.credentials.get with correct parameters', async () => {
      const mockGet = jest.fn();
      // @ts-ignore
      global.navigator.credentials = { get: mockGet };
      mockGet.mockResolvedValue({ token: 'mockToken' });

      const context = 'signin';

      await sdk.fedcm.launch(context);

      expect(mockGet).toHaveBeenCalledWith({
        identity: {
          context: context,
          providers: [
            {
              configURL: 'http://localhost:3000/P123/fedcm/config',
              clientId: 'P123',
            },
          ],
        },
      });
    });

    it('should return user response from sdk.refresh', async () => {
      const mockGet = jest.fn();
      // @ts-ignore
      global.navigator.credentials = { get: mockGet };
      mockGet.mockResolvedValue({ token: 'mockToken' });
      coreJs.refresh.mockResolvedValue({
        ok: true,
        data: { token: 'mockToken2' },
      });

      const context = 'signin';

      const response = await sdk.fedcm.launch(context);

      expect(coreJs.refresh).toHaveBeenCalledWith('mockToken');
      expect(response).toEqual({ ok: true, data: { token: 'mockToken2' } });
    });
  });

  describe('isSupported', () => {
    it('should return true if IdentityCredential is in window', () => {
      global.window['IdentityCredential'] = {};
      expect(sdk.fedcm.isSupported()).toBe(true);
    });

    it('should return false if IdentityCredential is not in window', () => {
      delete global.window['IdentityCredential'];
      expect(sdk.fedcm.isSupported()).toBe(false);
    });
  });
  describe('isLoggedIn', () => {
    it('should return true if navigator.credentials.get returns a valid token', async () => {
      const mockGet = jest.fn();
      // @ts-ignore
      global.navigator.credentials = { get: mockGet };
      mockGet.mockResolvedValue({ token: 'mockToken' });

      const result = await sdk.fedcm.isLoggedIn();

      expect(mockGet).toHaveBeenCalledWith({
        identity: {
          context: 'signin',
          providers: [
            {
              configURL: 'http://localhost:3000/P123/fedcm/config',
              clientId: 'P123',
            },
          ],
        },
      });
      expect(result).toBe(true);
    });

    it('should return false if navigator.credentials.get returns null', async () => {
      const mockGet = jest.fn();
      // @ts-ignore
      global.navigator.credentials = { get: mockGet };
      mockGet.mockResolvedValue(null);

      const result = await sdk.fedcm.isLoggedIn();

      expect(mockGet).toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it('should return false if navigator.credentials.get throws an error', async () => {
      const mockGet = jest.fn();
      // @ts-ignore
      global.navigator.credentials = { get: mockGet };
      mockGet.mockRejectedValue(new Error('Test Error'));

      const result = await sdk.fedcm.isLoggedIn();

      expect(mockGet).toHaveBeenCalled();
      expect(result).toBe(false);
    });
  });
});
