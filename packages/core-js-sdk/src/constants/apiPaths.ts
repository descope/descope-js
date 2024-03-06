/** API paths for the Descope service APIs */
export default {
  accessKey: {
    exchange: '/v1/auth/accesskey/exchange',
  },
  otp: {
    verify: '/v1/auth/otp/verify',
    signIn: '/v1/auth/otp/signin',
    signUp: '/v1/auth/otp/signup',
    update: {
      email: '/v1/auth/otp/update/email',
      phone: '/v1/auth/otp/update/phone',
    },
    signUpOrIn: '/v1/auth/otp/signup-in',
  },
  magicLink: {
    verify: '/v1/auth/magiclink/verify',
    signIn: '/v1/auth/magiclink/signin',
    signUp: '/v1/auth/magiclink/signup',
    update: {
      email: '/v1/auth/magiclink/update/email',
      phone: '/v1/auth/magiclink/update/phone',
    },
    signUpOrIn: '/v1/auth/magiclink/signup-in',
  },
  enchantedLink: {
    verify: '/v1/auth/enchantedlink/verify',
    signIn: '/v1/auth/enchantedlink/signin',
    signUp: '/v1/auth/enchantedlink/signup',
    session: '/v1/auth/enchantedlink/pending-session',
    update: {
      email: '/v1/auth/enchantedlink/update/email',
    },
    signUpOrIn: '/v1/auth/enchantedlink/signup-in',
  },
  oauth: {
    start: '/v1/auth/oauth/authorize',
    exchange: '/v1/auth/oauth/exchange',
    startNative: 'v1/auth/oauth/native/start',
    finishNative: 'v1/auth/oauth/native/finish',
  },
  saml: {
    start: '/v1/auth/saml/authorize',
    exchange: '/v1/auth/saml/exchange',
  },
  totp: {
    verify: '/v1/auth/totp/verify',
    signUp: '/v1/auth/totp/signup',
    update: '/v1/auth/totp/update',
  },
  notp: {
    signUpOrIn: '/v1/auth/notp/signup-in',
  },
  webauthn: {
    signUp: {
      start: '/v1/auth/webauthn/signup/start',
      finish: '/v1/auth/webauthn/signup/finish',
    },
    signIn: {
      start: '/v1/auth/webauthn/signin/start',
      finish: '/v1/auth/webauthn/signin/finish',
    },
    signUpOrIn: {
      start: '/v1/auth/webauthn/signup-in/start',
    },
    update: {
      start: 'v1/auth/webauthn/update/start',
      finish: '/v1/auth/webauthn/update/finish',
    },
  },
  password: {
    signUp: '/v1/auth/password/signup',
    signIn: '/v1/auth/password/signin',
    sendReset: '/v1/auth/password/reset',
    update: '/v1/auth/password/update',
    replace: '/v1/auth/password/replace',
    policy: '/v1/auth/password/policy',
  },
  refresh: '/v1/auth/refresh',
  selectTenant: '/v1/auth/tenant/select',
  logout: '/v1/auth/logout',
  logoutAll: '/v1/auth/logoutall',
  me: '/v1/auth/me',
  history: '/v1/auth/me/history',
  flow: {
    start: '/v1/flow/start',
    next: '/v1/flow/next',
  },
};
