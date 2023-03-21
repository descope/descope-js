import createWebAuthn from '../src/sdk/webauthn';

describe('webauthn', () => {
  beforeAll(() => {
    // @ts-ignore
    global.navigator.credentials = mockCredentials;
  });

  it('should complete signup flow', async () => {
    const mockSdk = createMockSdk();
    const webauthn = createWebAuthn(mockSdk);
    const finishSpy = jest.spyOn(mockSdk.webauthn.signUp, 'finish');

    await webauthn.signUp('foo', 'bar');

    expect(mockCredentials.create).toHaveBeenCalled();
    const [options] = mockCredentials.create.mock.lastCall;

    expect(options.publicKey).toBeDefined();
    expect(options.publicKey.challenge).toBeDefined();
    expect(options.publicKey.challenge.byteLength).toEqual(32);
    expect(options.publicKey.excludeCredentials).toHaveLength(1);

    expect(finishSpy).toHaveBeenCalled();
    const [transactionId, response] = finishSpy.mock.lastCall as any;

    expect(transactionId).toEqual('foo');
    expect(response).toBeTruthy();

    const parsedResponse = JSON.parse(response);
    expect(parsedResponse.id).toEqual(mockBase64);
    expect(parsedResponse.rawId).toEqual(mockBase64);
    expect(parsedResponse.response).toBeDefined();
    expect(parsedResponse.response.attestationObject).toEqual(mockBase64);
  });

  it('should bail if signup start fails', async () => {
    const mockSdk = createMockSdk();
    const webauthn = createWebAuthn(mockSdk);
    mockSdk.webauthn.signUp.start = () => ({ ok: false, data: {} });
    const response = await webauthn.signUp('foo', 'bar');
    expect(response.ok).toStrictEqual(false);
  });

  it('should complete signin flow', async () => {
    const mockSdk = createMockSdk();
    const webauthn = createWebAuthn(mockSdk);
    const finishSpy = jest.spyOn(mockSdk.webauthn.signIn, 'finish');

    await webauthn.signIn('foo');

    expect(mockCredentials.get).toHaveBeenCalled();
    const [options] = mockCredentials.get.mock.lastCall;

    expect(options.publicKey).toBeDefined();
    expect(options.publicKey.challenge).toBeDefined();
    expect(options.publicKey.challenge.byteLength).toEqual(32);
    expect(options.publicKey.allowCredentials).toHaveLength(1);

    expect(finishSpy).toHaveBeenCalled();
    const [transactionId, response] = finishSpy.mock.lastCall as any;

    expect(transactionId).toEqual('foo');
    expect(response).toBeTruthy();

    const parsedResponse = JSON.parse(response);
    expect(parsedResponse.id).toEqual(mockBase64);
    expect(parsedResponse.rawId).toEqual(mockBase64);
    expect(parsedResponse.response).toBeDefined();
    expect(parsedResponse.response.authenticatorData).toEqual(mockBase64);
  });

  it('should bail if signin start fails', async () => {
    const mockSdk = createMockSdk();
    const webauthn = createWebAuthn(mockSdk);
    mockSdk.webauthn.signIn.start = () => ({ ok: false, data: {} });
    const response = await webauthn.signIn('foo');
    expect(response.ok).toStrictEqual(false);
  });

  it('should complete signup-in flow with sign up', async () => {
    const mockSdk = createMockSdk(true);
    const webauthn = createWebAuthn(mockSdk);
    const finishSpy = jest.spyOn(mockSdk.webauthn.signUp, 'finish');

    await webauthn.signUpOrIn('foo');

    expect(mockCredentials.create).toHaveBeenCalled();
    const [options] = mockCredentials.create.mock.lastCall;

    expect(options.publicKey).toBeDefined();
    expect(options.publicKey.challenge).toBeDefined();
    expect(options.publicKey.challenge.byteLength).toEqual(32);
    expect(options.publicKey.excludeCredentials).toHaveLength(1);

    expect(finishSpy).toHaveBeenCalled();
    const [transactionId, response] = finishSpy.mock.lastCall as any;

    expect(transactionId).toEqual('foo');
    expect(response).toBeTruthy();

    const parsedResponse = JSON.parse(response);
    expect(parsedResponse.id).toEqual(mockBase64);
    expect(parsedResponse.rawId).toEqual(mockBase64);
    expect(parsedResponse.response).toBeDefined();
    expect(parsedResponse.response.attestationObject).toEqual(mockBase64);
  });

  it('should complete signup-in flow with sign in', async () => {
    const mockSdk = createMockSdk(false);
    const webauthn = createWebAuthn(mockSdk);
    const finishSpy = jest.spyOn(mockSdk.webauthn.signIn, 'finish');

    await webauthn.signUpOrIn('foo');

    expect(mockCredentials.get).toHaveBeenCalled();
    const [options] = mockCredentials.get.mock.lastCall;

    expect(options.publicKey).toBeDefined();
    expect(options.publicKey.challenge).toBeDefined();
    expect(options.publicKey.challenge.byteLength).toEqual(32);
    expect(options.publicKey.allowCredentials).toHaveLength(1);

    expect(finishSpy).toHaveBeenCalled();
    const [transactionId, response] = finishSpy.mock.lastCall as any;

    expect(transactionId).toEqual('foo');
    expect(response).toBeTruthy();

    const parsedResponse = JSON.parse(response);
    expect(parsedResponse.id).toEqual(mockBase64);
    expect(parsedResponse.rawId).toEqual(mockBase64);
    expect(parsedResponse.response).toBeDefined();
    expect(parsedResponse.response.authenticatorData).toEqual(mockBase64);
  });

  it('should bail if signup-in start fails', async () => {
    const mockSdk = createMockSdk();
    const webauthn = createWebAuthn(mockSdk);
    mockSdk.webauthn.signUpOrIn.start = () => ({ ok: false, data: {} });
    const response = await webauthn.signUpOrIn('foo');
    expect(response.ok).toStrictEqual(false);
  });

  it('should complete update flow', async () => {
    const mockSdk = createMockSdk();
    const webauthn = createWebAuthn(mockSdk);
    const finishSpy = jest.spyOn(mockSdk.webauthn.update, 'finish');

    await webauthn.update('foo', 'token');

    expect(mockCredentials.create).toHaveBeenCalled();
    const [options] = mockCredentials.create.mock.lastCall;

    expect(options.publicKey).toBeDefined();
    expect(options.publicKey.challenge).toBeDefined();
    expect(options.publicKey.challenge.byteLength).toEqual(32);
    expect(options.publicKey.excludeCredentials).toHaveLength(1);

    expect(finishSpy).toHaveBeenCalled();
    const [transactionId, response] = finishSpy.mock.lastCall as any;

    expect(transactionId).toEqual('foo');
    expect(response).toBeTruthy();

    const parsedResponse = JSON.parse(response);
    expect(parsedResponse.id).toEqual(mockBase64);
    expect(parsedResponse.rawId).toEqual(mockBase64);
    expect(parsedResponse.response).toBeDefined();
    expect(parsedResponse.response.attestationObject).toEqual(mockBase64);
  });

  it('should bail if update start fails', async () => {
    const mockSdk = createMockSdk();
    const webauthn = createWebAuthn(mockSdk);
    mockSdk.webauthn.update.start = () => ({ ok: false, data: {} });
    const response = await webauthn.update('foo', 'token');
    expect(response.ok).toStrictEqual(false);
  });
});

function createMockSdk(signUpOrInCreate?: boolean): any {
  return {
    webauthn: {
      signUp: {
        start: () => ({ ok: true, data: mockCreateOptions }),
        finish: () => {},
      },
      signIn: {
        start: () => ({ ok: true, data: mockGetOptions }),
        finish: () => {},
      },
      signUpOrIn: {
        start: () => ({
          ok: true,
          data: signUpOrInCreate ? mockCreateOptions : mockGetOptions,
        }),
      },
      update: {
        start: () => ({ ok: true, data: mockCreateOptions }),
        finish: () => {},
      },
    },
  };
}

const mockArray = new Uint8Array([0x66, 0x6f, 0x6f, 0x62]);
const mockBase64 = 'Zm9vYg';

const mockCreateOptions = {
  transactionId: 'foo',
  options: JSON.stringify({
    publicKey: {
      challenge: 'RCDjLZgO_tSVZOkFQEkn3-gVyTQ1nhdUd4i1aqf1J38',
      user: {
        id: 'MkFsanhuc1ROdHhUb2ZIZkVrY2oxRlB0SWxB',
      },
      excludeCredentials: [
        {
          id: 'lAofRlxgQuXO1EX1CusBKcL1hGusfRjxE1r_Wfv2t7wgl_InQdRiJdc2JzBFI-_8ZWaquVQ58BNWvFqG5vrKiwLKwekNdHcvU5YgV7K6bIKwkbUZUjs0lchAbXs0',
        },
      ],
    },
  }),
  create: true,
};

const mockCreateResponse = new (class {
  get id() {
    return mockBase64;
  }
  get rawId() {
    return mockArray;
  }
  get type() {
    return 'public-key';
  }
  get response() {
    return new (class {
      get attestationObject() {
        return mockArray;
      }
      get clientDataJSON() {
        return mockArray;
      }
    })();
  }
})();

const mockGetOptions = {
  transactionId: 'foo',
  options: JSON.stringify({
    publicKey: {
      challenge: 'RCDjLZgO_tSVZOkFQEkn3-gVyTQ1nhdUd4i1aqf1J38',
      allowCredentials: [
        {
          id: 'lAofRlxgQuXO1EX1CusBKcL1hGusfRjxE1r_Wfv2t7wgl_InQdRiJdc2JzBFI-_8ZWaquVQ58BNWvFqG5vrKiwLKwekNdHcvU5YgV7K6bIKwkbUZUjs0lchAbXs0',
        },
      ],
    },
  }),
  create: false,
};

const mockGetResponse = new (class {
  get id() {
    return mockBase64;
  }
  get rawId() {
    return mockArray;
  }
  get type() {
    return 'public-key';
  }
  get response() {
    return new (class {
      get authenticatorData() {
        return mockArray;
      }
      get clientDataJSON() {
        return mockArray;
      }
      get signature() {
        return mockArray;
      }
    })();
  }
})();

const mockCredentials = {
  create: jest.fn().mockReturnValue(mockCreateResponse),
  get: jest.fn().mockReturnValue(mockGetResponse),
};
