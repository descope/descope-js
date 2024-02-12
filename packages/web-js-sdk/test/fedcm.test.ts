import createSdk from '../src/index';

const coreJs = {
  oauth: {
    startNative: jest.fn(),
    finishNative: jest.fn(),
  },
  webauthn: {},
};

jest.mock('@descope/core-js-sdk', () => ({
  default: () => coreJs,
  wrapWith: (obj: {}) => obj,
  __esModule: true,
}));

const sdk = createSdk({ projectId: 'P123' });

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
  it('call start native when calling oneTap with provider and login options', () => {
    // mock startNative response to be ok
    coreJs.oauth.startNative.mockResolvedValue({ ok: true, data: {} });
    sdk.fedcm.oneTap('google', { auto_select: true }, { stepup: false });
    expect(coreJs.oauth.startNative).toHaveBeenCalledWith('google', {
      stepup: false,
    });
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
});
