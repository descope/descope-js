import { JWTResponse, SdkResponse, ResponseData } from '@descope/core-js-sdk';
import { IS_BROWSER } from '../constants';
import { CoreSdk } from '../types';

type CreateWebauthn = typeof createWebAuthn;

const withCoreFns =
  <I extends Parameters<CreateWebauthn>, O extends ReturnType<CreateWebauthn>>(
    creator: (...args: I) => O
  ) =>
  (...args: I) => {
    const obj = creator(...args);

    Object.assign(obj.signUp, args[0].webauthn.signUp);
    Object.assign(obj.signIn, args[0].webauthn.signIn);
    Object.assign(obj.signUpOrIn, args[0].webauthn.signUpOrIn);
    Object.assign(obj.update, args[0].webauthn.update);

    return obj as {
      [K in keyof O]: K extends keyof I[0]['webauthn']
        ? O[K] & I[0]['webauthn'][K]
        : O[K];
    };
  };

/** Constructs a higher level WebAuthn API that wraps the functions from code-js-sdk */
const createWebAuthn = (sdk: CoreSdk) => ({
  async signUp(identifier: string, name: string) {
    const startResponse = await sdk.webauthn.signUp.start(
      identifier,
      window.location.origin,
      name
    );
    if (!startResponse.ok) {
      return startResponse as unknown as SdkResponse<JWTResponse>;
    }
    const createResponse = await create(startResponse.data.options);
    const finishResponse = await sdk.webauthn.signUp.finish(
      startResponse.data.transactionId,
      createResponse
    );
    return finishResponse;
  },

  async signIn(identifier: string) {
    const startResponse = await sdk.webauthn.signIn.start(
      identifier,
      window.location.origin
    );
    if (!startResponse.ok) {
      return startResponse as unknown as SdkResponse<JWTResponse>;
    }
    const getResponse = await get(startResponse.data.options);
    const finishResponse = await sdk.webauthn.signIn.finish(
      startResponse.data.transactionId,
      getResponse
    );
    return finishResponse;
  },

  async signUpOrIn(identifier: string) {
    const startResponse = await sdk.webauthn.signUpOrIn.start(
      identifier,
      window.location.origin
    );
    if (!startResponse.ok) {
      return startResponse as unknown as SdkResponse<JWTResponse>;
    }
    if (startResponse.data?.create) {
      const createResponse = await create(startResponse.data.options);
      const finishResponse = await sdk.webauthn.signUp.finish(
        startResponse.data.transactionId,
        createResponse
      );
      return finishResponse;
    } else {
      const getResponse = await get(startResponse.data.options);
      const finishResponse = await sdk.webauthn.signIn.finish(
        startResponse.data.transactionId,
        getResponse
      );
      return finishResponse;
    }
  },

  async update(identifier: string, token: string) {
    const startResponse = await sdk.webauthn.update.start(
      identifier,
      window.location.origin,
      token
    );
    if (!startResponse.ok) {
      return startResponse as SdkResponse<ResponseData>;
    }
    const createResponse = await create(startResponse.data.options);
    const finishResponse = await sdk.webauthn.update.finish(
      startResponse.data.transactionId,
      createResponse
    );
    return finishResponse;
  },

  /** Helper functions for working with WebAuthn browser APIs using JSON data */
  helpers: {
    /** Wraps the navigation.credentials.create call to translate JSON inputs and outputs */
    create,
    /** Wraps the navigation.credentials.get call to translate JSON inputs and outputs */
    get,
    /** Checks if the browser supports WebAuthn, and can optionally require in
     * addition that the browser supports WebAuthn with built-in biometrics */
    isSupported,
    conditional,
  },
});

// Helpers functions

async function create(options: string): Promise<string> {
  const createOptions = decodeCreateOptions(options);
  const createResponse = (await navigator.credentials.create(
    createOptions
  )) as AttestationPublicKeyCredential;
  return encodeCreateResponse(createResponse);
}

async function get(options: string): Promise<string> {
  const getOptions = decodeGetOptions(options);
  const getResponse = (await navigator.credentials.get(
    getOptions
  )) as AssertionPublicKeyCredential;
  return encodeGetResponse(getResponse);
}

/**
 * This function should be used in passkeys autofill (conditional UI)
 * It handles the call to "navigator.credentials.get" and adds the required options
 * @param options webauthn start options
 * @param abort: AbortController instance
 * @returns encoded "navigator.credentials.get" response
 */
async function conditional(
  options: string,
  abort: AbortController
): Promise<string> {
  const getOptions = decodeGetOptions(options);
  getOptions.signal = abort.signal;
  getOptions.mediation = 'conditional' as any;
  const getResponse = (await navigator.credentials.get(
    getOptions
  )) as AssertionPublicKeyCredential;
  return encodeGetResponse(getResponse);
}

// eslint-disable-next-line import/exports-last
export async function isSupported(
  requirePlatformAuthenticator: boolean = false
): Promise<boolean> {
  if (!IS_BROWSER) {
    return Promise.resolve(false);
  }
  const supported = !!(
    PublicKeyCredential &&
    navigator.credentials &&
    navigator.credentials.create &&
    navigator.credentials.get
  );
  if (
    supported &&
    requirePlatformAuthenticator &&
    PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable
  ) {
    return PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  }
  return supported;
}

// Conversion of data structures for Create/Attestation/Register ceremony

type AttestationPublicKeyCredential = PublicKeyCredential & {
  response: AuthenticatorAttestationResponse;
};

function decodeCreateOptions(value: string): CredentialCreationOptions {
  const options = JSON.parse(value);
  options.publicKey.challenge = decodeBase64Url(options.publicKey.challenge);
  options.publicKey.user.id = decodeBase64Url(options.publicKey.user.id);
  options.publicKey.excludeCredentials?.forEach((item: any) => {
    item.id = decodeBase64Url(item.id);
  });
  return options;
}

function encodeCreateResponse(
  credential: AttestationPublicKeyCredential
): string {
  return JSON.stringify({
    id: credential.id,
    rawId: encodeBase64Url(credential.rawId),
    type: credential.type,
    response: {
      attestationObject: encodeBase64Url(credential.response.attestationObject),
      clientDataJSON: encodeBase64Url(credential.response.clientDataJSON),
    },
  });
}

// Conversion of data structures for Get/Assertion/Login ceremony

type AssertionPublicKeyCredential = PublicKeyCredential & {
  response: AuthenticatorAssertionResponse;
};

function decodeGetOptions(value: string): CredentialRequestOptions {
  const options = JSON.parse(value);
  options.publicKey.challenge = decodeBase64Url(options.publicKey.challenge);
  options.publicKey.allowCredentials?.forEach((item: any) => {
    item.id = decodeBase64Url(item.id);
  });
  return options;
}

function encodeGetResponse(credential: AssertionPublicKeyCredential): string {
  return JSON.stringify({
    id: credential.id,
    rawId: encodeBase64Url(credential.rawId),
    type: credential.type,
    response: {
      authenticatorData: encodeBase64Url(credential.response.authenticatorData),
      clientDataJSON: encodeBase64Url(credential.response.clientDataJSON),
      signature: encodeBase64Url(credential.response.signature),
      userHandle: credential.response.userHandle
        ? encodeBase64Url(credential.response.userHandle)
        : undefined,
    },
  });
}

// Conversion between ArrayBuffers and Base64Url strings

function decodeBase64Url(value: string): ArrayBufferLike {
  const base64 = value.replace(/_/g, '/').replace(/-/g, '+');
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)).buffer;
}

function encodeBase64Url(value: ArrayBufferLike): string {
  const base64 = btoa(String.fromCharCode.apply(null, new Uint8Array(value)));
  return base64.replace(/\//g, '_').replace(/\+/g, '-').replace(/=/g, '');
}

// Exports
export default withCoreFns(createWebAuthn);
