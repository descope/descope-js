const BASE_CONTENT_URL_KEY = 'base.content.url';
export const UI_COMPONENTS_URL_KEY = 'base.ui.components.url';
export const UI_COMPONENTS_URL_VERSION_PLACEHOLDER = '<version>';
export const IS_LOCAL_STORAGE = typeof localStorage !== 'undefined';
export const BASE_CONTENT_URL =
  (IS_LOCAL_STORAGE && localStorage.getItem(BASE_CONTENT_URL_KEY)) ||
  'https://static.descope.com/pages';
export const UI_COMPONENTS_URL =
  (IS_LOCAL_STORAGE && localStorage.getItem(UI_COMPONENTS_URL_KEY)) ||
  'https://static.descope.com/npm/@descope/web-components-ui@<version>/dist/umd/index.js';
export const URL_RUN_IDS_PARAM_NAME = 'descope-login-flow';
export const URL_TOKEN_PARAM_NAME = 't';
export const URL_CODE_PARAM_NAME = 'code';
export const URL_ERR_PARAM_NAME = 'err';
export const URL_REDIRECT_AUTH_CHALLENGE_PARAM_NAME = 'ra-challenge';
export const URL_REDIRECT_AUTH_CALLBACK_PARAM_NAME = 'ra-callback';
export const URL_REDIRECT_AUTH_INITIATOR_PARAM_NAME = 'ra-initiator';
export const DESCOPE_ATTRIBUTE_PREFIX = 'data-descope-';
export const DESCOPE_ATTRIBUTE_EXCLUDE_FIELD = 'data-exclude-field';
export const DESCOPE_ATTRIBUTE_EXCLUDE_NEXT_BUTTON = 'data-exclude-next';
export const DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY = 'dls_last_auth';
export const OIDC_IDP_STATE_ID_PARAM_NAME = 'state_id';
export const SAML_IDP_STATE_ID_PARAM_NAME = 'saml_idp_state_id';
export const SAML_IDP_USERNAME_PARAM_NAME = 'saml_idp_username';
export const SSO_APP_ID_PARAM_NAME = 'sso_app_id';

export const ELEMENT_TYPE_ATTRIBUTE = 'data-type';

export const RESPONSE_ACTIONS = {
  redirect: 'redirect',
  poll: 'poll',
  webauthnCreate: 'webauthnCreate',
  webauthnGet: 'webauthnGet',
  loadForm: 'loadForm',
};

export const ASSETS_FOLDER = 'v2-beta';
export const PREV_VER_ASSETS_FOLDER = 'v2-alpha';

// Those files are saved on a new folder to prevent breaking changes
export const THEME_FILENAME = 'theme.json';
export const CONFIG_FILENAME = 'config.json';

export const CUSTOM_INTERACTIONS = {
  submit: 'submit',
  polling: 'polling',
};
