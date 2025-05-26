import { JWTResponse, SdkResponse, LoginOptions } from '@descope/core-js-sdk';
import { CoreSdk } from '../types';
import { IS_BROWSER } from '../constants';
import { apiPaths } from '../apiPaths';

/**
 * Configuration for OneTap.
 */
interface OneTapConfig {
  /** Whether to auto select. Optional. */
  auto_select?: boolean;

  /** Whether to cancel on tap outside. Optional. */
  cancel_on_tap_outside?: boolean;

  /** ID of the prompt parent. Optional. */
  prompt_parent_id?: string;

  /** Context. Optional. */
  context?: 'signin' | 'signup' | 'use';

  /** Callback function to handle the intermediate iframe close event. Optional. */
  intermediate_iframe_close_callback?: () => void;

  /** Whether to support ITP. Optional. */
  itp_support?: boolean;

  /** Login hint. Optional. */
  login_hint?: string;

  /** HD. Optional. */
  hd?: string;

  /** Whether to use FedCM for prompt. Optional. */
  use_fedcm_for_prompt?: boolean;
}

/**
 * Response from the credential.
 */
interface CredentialResponse {
  /** Credential. */
  credential: string;

  /** How the selection was made. */
  select_by:
    | 'auto'
    | 'user'
    | 'user_1tap'
    | 'user_2tap'
    | 'btn'
    | 'btn_confirm'
    | 'btn_add_session'
    | 'btn_confirm_add_session';
}

interface FedCMAssertionResponse {
  token: string;
  error: {
    code: string;
    url: string;
  };
}

interface IdentityProviderConfig {
  configURL: string;
  clientId: string;
}

type IdentityCredentialRequestOptionsContext =
  | 'signin'
  | 'signup'
  | 'use'
  | 'continue';

interface IdentityProviderRequestOptions extends IdentityProviderConfig {
  nonce?: string;
  loginHint?: string;
  domainHint?: string;
}

interface IdentityCredentialRequestOptions {
  providers: IdentityProviderRequestOptions[];
  context?: IdentityCredentialRequestOptionsContext;
}

interface FedCMCredentialRequestOptions {
  identity?: IdentityCredentialRequestOptions;
}

type OneTapInitialize = ({
  client_id,
  callback,
  nonce,
}: {
  client_id: string;
  callback: (res: CredentialResponse) => void;
  nonce: string;
} & OneTapConfig) => void;

type PromptNotification = {
  isSkippedMoment: () => boolean;
  isDismissedMoment: () => boolean;
  getDismissedReason: () => string;
  getSkippedReason: () => string;
};

const generateNonce = () => {
  if (window.crypto && window.crypto.getRandomValues) {
    const array = new Uint8Array(16); // 16 bytes = 128 bits
    window.crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join(
      '',
    );
  } else {
    // Fallback (not cryptographically secure)
    return Math.random().toString(36).substring(2);
  }
};

/**
 * Constructs a higher level FedCM API that wraps the functions from code-js-sdk.
 * @param sdk The CoreSdk instance.
 * @returns The FedCM API.
 */
const createFedCM = (sdk: CoreSdk, projectId: string) => ({
  onetap: {
    requestExchangeCode(options: {
      provider?: string;
      oneTapConfig?: OneTapConfig;
      loginOptions?: LoginOptions;
      onSkipped?: (reason?: string) => void;
      onDismissed?: (reason?: string) => void;
      onFailed?: (error: Error) => void;
      onCodeReceived: (code: string) => void;
    }) {
      performOneTap(sdk, options);
    },

    requestAuthentication(options?: {
      provider?: string;
      oneTapConfig?: OneTapConfig;
      loginOptions?: LoginOptions;
      onSkipped?: (reason?: string) => void;
      onDismissed?: (reason?: string) => void;
      onFailed?: (error: Error) => void;
      onAuthenticated?: (response: JWTResponse) => void;
    }) {
      performOneTap(sdk, options);
    },
  },

  /**
   * @deprecated Call `onetap.requestAuthentication` instead.
   */
  async oneTap(
    provider?: string,
    oneTapConfig?: OneTapConfig,
    loginOptions?: LoginOptions,
    onSkipped?: (reason?: string) => void,
    onDismissed?: (reason?: string) => void,
  ) {
    await performOneTapAsync(sdk, {
      provider,
      oneTapConfig,
      loginOptions,
      onSkipped,
      onDismissed,
    });
  },

  async launch(
    context?: IdentityCredentialRequestOptionsContext,
  ): Promise<SdkResponse<JWTResponse>> {
    const configURL = sdk.httpClient.buildUrl(
      projectId + apiPaths.fedcm.config,
    );
    const req: FedCMCredentialRequestOptions = {
      identity: {
        context: context || 'signin',
        providers: [
          {
            configURL,
            clientId: projectId,
          },
        ],
      },
    };
    const res = await navigator.credentials?.get(req as any);
    return sdk.refresh((res as any as FedCMAssertionResponse).token);
  },

  isSupported(): boolean {
    return IS_BROWSER && 'IdentityCredential' in window;
  },

  async isLoggedIn(
    context?: IdentityCredentialRequestOptionsContext,
  ): Promise<boolean> {
    const configURL = sdk.httpClient.buildUrl(
      projectId + apiPaths.fedcm.config,
    );
    try {
      const req: FedCMCredentialRequestOptions = {
        identity: {
          context: context || 'signin',
          providers: [
            {
              configURL,
              clientId: projectId,
            },
          ],
        },
      };
      const res = await navigator.credentials?.get(req as any);
      return !!res && !!(res as any as FedCMAssertionResponse).token;
    } catch (e) {
      // Any error likely indicates no active session.
      return false;
    }
  },
});

// Helpers functions
async function getGoogleClient(): Promise<{
  initialize: OneTapInitialize;
  prompt: (cb: (notification: PromptNotification) => void) => void;
}> {
  return new Promise((resolve, reject) => {
    if ((window as any).google) {
      resolve((window as any).google.accounts.id);
      return;
    }

    /* istanbul ignore next */
    let googleScript = document.getElementById(
      'google-gsi-client-script',
    ) as HTMLScriptElement;

    /* istanbul ignore next */
    if (!googleScript) {
      googleScript = document.createElement('script');
      document.head.appendChild(googleScript);
      googleScript.async = true;
      googleScript.defer = true;
      googleScript.id = 'google-gsi-client-script';
      googleScript.src = 'https://accounts.google.com/gsi/client';
    }

    /* istanbul ignore next */
    googleScript.onload = function () {
      if ((window as any).google) {
        resolve((window as any).google.accounts.id);
      } else {
        reject('Failed to load Google GSI client script - not loaded properly');
      }
    };
    /* istanbul ignore next */
    googleScript.onerror = function () {
      reject('Failed to load Google GSI client script - failed to load');
    };
  });
}

async function performOneTap(
  sdk: CoreSdk,
  options?: {
    provider?: string;
    oneTapConfig?: OneTapConfig;
    loginOptions?: LoginOptions;
    onSkipped?: (reason?: string) => void;
    onDismissed?: (reason?: string) => void;
    onFailed?: (error: Error) => void;
    onCodeReceived?: (code: string) => void;
    onAuthenticated?: (response: JWTResponse) => void;
  },
) {
  try {
    await performOneTapAsync(sdk, options);
  } catch (e) {
    options?.onFailed?.(e);
  }
}

async function performOneTapAsync(
  sdk: CoreSdk,
  options?: {
    provider?: string;
    oneTapConfig?: OneTapConfig;
    loginOptions?: LoginOptions;
    onSkipped?: (reason?: string) => void;
    onDismissed?: (reason?: string) => void;
    onCodeReceived?: (code: string) => void;
    onAuthenticated?: (response: JWTResponse) => void;
  },
) {
  const auth = await startOneTap(
    sdk,
    options.provider,
    options.oneTapConfig,
    options.onSkipped,
    options.onDismissed,
  );
  if (!auth.credential) {
    return null;
  }
  if (options?.onCodeReceived) {
    const response = await sdk.oauth.verifyOneTapIDToken(
      auth.provider,
      auth.credential,
      auth.nonce,
      options?.loginOptions,
    );
    if (!response.ok || !response.data) {
      throw new Error(
        'Failed to verify OneTap client ID for provider ' + auth.provider,
      );
    }
    options?.onCodeReceived?.(response.data.code);
  } else {
    const response = await sdk.oauth.exchangeOneTapIDToken(
      auth.provider,
      auth.credential,
      auth.nonce,
      options?.loginOptions,
    );
    if (!response.ok || !response.data) {
      throw new Error(
        'Failed to exchange OneTap client ID for provider ' + auth.provider,
      );
    }
    options?.onAuthenticated?.(response.data);
  }
}

async function startOneTap(
  sdk: CoreSdk,
  provider: string = 'google',
  oneTapConfig?: OneTapConfig,
  onSkipped?: (reason?: string) => void,
  onDismissed?: (reason?: string) => void,
): Promise<{
  provider: string;
  nonce: string;
  credential?: string;
}> {
  const nonce = generateNonce();
  const googleClient = await getGoogleClient();

  const clientIdRes = await sdk.oauth.getOneTapClientId(provider);
  if (!clientIdRes.ok) {
    throw new Error('Failed to get OneTap client ID for provider ' + provider);
  }
  const clientId = clientIdRes.data.clientId;

  return new Promise((resolve) => {
    const callback = (response?: CredentialResponse) => {
      resolve({
        provider,
        nonce,
        credential: response?.credential,
      });
    };

    googleClient.initialize({
      ...oneTapConfig,
      itp_support: oneTapConfig?.itp_support ?? true,
      use_fedcm_for_prompt: oneTapConfig?.use_fedcm_for_prompt ?? true,
      client_id: clientId,
      callback,
      nonce,
    });

    googleClient.prompt((notification) => {
      if (onDismissed && notification?.isDismissedMoment()) {
        const reason = notification.getDismissedReason?.();
        onDismissed?.(reason);
        callback();
        return;
      }

      if (onSkipped && notification?.isSkippedMoment()) {
        const reason = notification.getSkippedReason?.();
        onSkipped?.(reason);
        callback();
        return;
      }
    });
  });
}

export default createFedCM;
export type { OneTapConfig };
