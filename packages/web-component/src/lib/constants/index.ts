export * from './general';
export * from './content';
export * from './uiComponents';

export const URL_RUN_IDS_PARAM_NAME = 'descope-login-flow';
export const URL_TOKEN_PARAM_NAME = 't';
export const URL_CODE_PARAM_NAME = 'code';
export const URL_ERR_PARAM_NAME = 'err';
export const URL_REDIRECT_AUTH_CHALLENGE_PARAM_NAME = 'ra-challenge';
export const URL_REDIRECT_AUTH_CALLBACK_PARAM_NAME = 'ra-callback';
export const URL_REDIRECT_AUTH_BACKUP_CALLBACK_PARAM_NAME =
  'ra-backup-callback';
export const URL_REDIRECT_AUTH_INITIATOR_PARAM_NAME = 'ra-initiator';
export const DESCOPE_ATTRIBUTE_PREFIX = 'data-descope-';
export const DESCOPE_ATTRIBUTE_EXCLUDE_FIELD = 'data-exclude-field';
export const DESCOPE_ATTRIBUTE_EXCLUDE_NEXT_BUTTON = 'data-exclude-next';
export const DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY = 'dls_last_auth';
export const OIDC_IDP_STATE_ID_PARAM_NAME = 'state_id';
export const SAML_IDP_STATE_ID_PARAM_NAME = 'saml_idp_state_id';
export const SAML_IDP_USERNAME_PARAM_NAME = 'saml_idp_username';
export const DESCOPE_IDP_INITIATED_PARAM_NAME = 'descope_idp_initiated';
export const SSO_APP_ID_PARAM_NAME = 'sso_app_id';
export const OIDC_LOGIN_HINT_PARAM_NAME = 'oidc_login_hint';

export const ELEMENT_TYPE_ATTRIBUTE = 'data-type';

export const RESPONSE_ACTIONS = {
  redirect: 'redirect',
  poll: 'poll',
  webauthnCreate: 'webauthnCreate',
  webauthnGet: 'webauthnGet',
  loadForm: 'loadForm',
};

export const CUSTOM_INTERACTIONS = {
  submit: 'submit',
  polling: 'polling',
};

export const HAS_DYNAMIC_VALUES_ATTR_NAME = 'data-has-dynamic-attr-values';

export const ELEMENTS_TO_IGNORE_ENTER_KEY_ON = [
  'descope-multi-select-combo-box',
];
