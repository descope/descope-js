type DeviceInfo = {
  webAuthnSupport?: boolean;
};

type LastAuth = {
  authMethod?: AuthMethod;
  oauthProvider?: string;
  name?: string;
  loginId?: string;
};

type AuthMethod =
  | 'magiclink'
  | 'enchantedlink'
  | 'otp'
  | 'totp'
  | 'oauth'
  | 'saml'
  | 'webauthn';

export type SdkFn = (...args: any[]) => Promise<SdkResponse<ResponseData>>;

export type MaskedPhone = {
  maskedPhone: string;
};

export type MaskedEmail = {
  maskedEmail: string;
};

/** User base details from Descope API */
export type User = {
  email?: string;
  name?: string;
  phone?: string;
};

/** User extended details from Descope API */
export type UserResponse = User & {
  loginIds: string[];
  userId: string;
  verifiedEmail?: boolean;
  verifiedPhone?: boolean;
  picture?: string;
  roleNames?: string[];
  userTenants?: UserTenant[];
  createTime: number;
};

/** A tenant association mapping  */
export type UserTenant = {
  tenantId: string;
  roleNames?: string[];
};

/** Login options to be added to the different authentication methods */
export type LoginOptions = {
  stepup?: boolean;
  mfa?: boolean;
  customClaims?: Record<string, any>;
};

/** Authentication info result from the various JWT validations  */
export type JWTResponse = {
  sessionJwt: string;
  refreshJwt?: string;
  cookieDomain?: string;
  cookiePath?: string;
  cookieMaxAge?: number;
  cookieExpiration?: number;
  user?: UserResponse;
  firstSeen?: boolean;
};

/** Authentication info result from exchanging access keys for a session */
export type ExchangeAccessKeyResponse = {
  keyId: string;
  sessionJwt: string;
  expiration: number;
};

/** The response returned from the various start webauthn functions */
export type WebAuthnStartResponse = {
  transactionId: string;
  options: string;
  create: boolean;
};

/** Enchanted link response */
export type EnchantedLinkResponse = {
  /** Pending reference URL to poll while waiting for user to click magic link */
  pendingRef: string;
  /** Link id, on which link the user should click */
  linkId: string;
  /** Email to which the link was sent to */
  maskedEmail: string;
};

/** URL response to redirect user in case of OAuth or SSO */
export type URLResponse = {
  url: string;
};

/** TOTP response with the TOTP details */
export type TOTPResponse = {
  provisioningURL: string;
  image: string;
  key: string;
};

/** Password reset response with details according to response method */
export type PasswordResetResponse = {
  resetMethod: string;
  pendingRef?: string;
  linkId?: string;
  maskedEmail: string;
};

/** A subset of the password policy that can be checked on the client side for better UX */
export type PasswordPolicyResponse = {
  minLength: number;
  lowercase: boolean;
  uppercase: boolean;
  number: boolean;
  nonAlphanumeric: boolean;
};

/** Phone delivery methods which are currently supported */
export enum DeliveryPhone {
  sms = 'sms',
  whatsapp = 'whatsapp',
}

export enum DeliveryEmail {
  email = 'email',
}

/** All delivery methods currently supported */
export type DeliveryMethods = DeliveryPhone | DeliveryEmail;

export const DeliveryMethods = {
  ...DeliveryPhone,
  ...DeliveryEmail,
} as const;

/** All flow execution statuses
 *  - waiting - flow execution is waiting for user interaction
 *  - running - flow execution is currently running
 *  - completed - flow execution completed successfully
 *  - failed - flow execution failed
 */
export enum FlowStatus {
  waiting = 'waiting',
  running = 'running',
  completed = 'completed',
  failed = 'failed',
}

/** All flow response action
 *  - screen - next action is to render  screen
 *  - poll - next action is poll for next after timeout
 *  - redirect - next action is to redirect (redirection details in 'redirect' attribute)
 *  - webauthnCreate/webauthnGet - next action is to prompt webauthn (details in 'webauthn' attribute)
 *  - none - no next action
 */
export type FlowAction =
  | 'screen'
  | 'poll'
  | 'redirect'
  | 'webauthnCreate'
  | 'webauthnGet'
  | 'none';

/** Flow response with flow execution details */
export type FlowResponse = {
  // current execution identifier
  executionId: string;
  // current step identifier
  stepId: string;
  // flow execution status
  status: FlowStatus;
  // the next required action
  action: FlowAction;
  // screen data - if action is 'screen'
  screen?: {
    // screen identifier
    id: string;
    // extra dynamic state required for rendering screen
    state: Record<string, any>;
  };
  // redirect data - if action is 'redirect'
  redirect?: {
    url: string;
  };
  // webauthn data - if action is one of 'webauthnCreate', 'webauthnGet'
  webauthn?: {
    transactionId: string;
    options: string;
    create: boolean;
  };
  // an error that occurred during flow execution, used for debugging / integrating
  error?: {
    code: string;
    description: string;
    message: string;
  };
  // authentication information response, if response is authenticated
  authInfo?: JWTResponse;
  lastAuth?: Pick<LastAuth, 'authMethod' | 'oauthProvider'>;
};

export type Options = {
  redirectUrl?: string;
  tenant?: string;
  deviceInfo?: DeviceInfo;
  lastAuth?: LastAuth;
};

export type ResponseData = Record<string, any>;

/**
 * Response from our SDK calls which includes the result (ok, code, error).
 * The relevant data is provided in the more specific interfaces extending SdkResponse.
 */
export type SdkResponse<T extends ResponseData> = {
  code?: number;
  ok: boolean;
  response?: Response;
  error?: {
    errorCode: string;
    errorDescription: string;
    errorMessage?: string;
    retryAfter?: string;
  };
  data?: T;
};

/** Different delivery method */
export type Deliveries<T extends Record<DeliveryMethods, SdkFn> | SdkFn> = {
  [S in DeliveryMethods]: T extends Record<DeliveryMethods, SdkFn> ? T[S] : T;
};

export type DeliveriesPhone<T extends Record<DeliveryPhone, SdkFn> | SdkFn> = {
  [S in DeliveryPhone]: T extends Record<DeliveryPhone, SdkFn> ? T[S] : T;
};

/** Map different functions to email vs phone (sms, whatsapp) */
export type DeliveriesMap<EmailFn extends SdkFn, PhoneFn extends SdkFn> = {
  [S in DeliveryMethods]: S extends 'email' ? EmailFn : PhoneFn;
};

/** Logger type that supports the given levels (debug, log, error) */
export type Logger = Pick<Console, 'debug' | 'log' | 'error' | 'warn'>;

export type UpdateOptions<T extends boolean> = {
  addToLoginIDs?: T,
  onMergeUseExisting?: T extends true? boolean : never
}
