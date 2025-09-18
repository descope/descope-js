import {
  ASSETS_FOLDER,
  BASE_CONTENT_URL,
  DESCOPE_ATTRIBUTE_PREFIX,
  URL_CODE_PARAM_NAME,
  URL_ERR_PARAM_NAME,
  URL_RUN_IDS_PARAM_NAME,
  URL_TOKEN_PARAM_NAME,
  URL_REDIRECT_AUTH_CHALLENGE_PARAM_NAME,
  URL_REDIRECT_AUTH_CALLBACK_PARAM_NAME,
  URL_REDIRECT_AUTH_BACKUP_CALLBACK_PARAM_NAME,
  URL_REDIRECT_AUTH_INITIATOR_PARAM_NAME,
  OIDC_IDP_STATE_ID_PARAM_NAME,
  SAML_IDP_STATE_ID_PARAM_NAME,
  SAML_IDP_USERNAME_PARAM_NAME,
  SSO_APP_ID_PARAM_NAME,
  OIDC_LOGIN_HINT_PARAM_NAME,
  DESCOPE_IDP_INITIATED_PARAM_NAME,
  OVERRIDE_CONTENT_URL,
  OIDC_PROMPT_PARAM_NAME,
  OIDC_RESOURCE_PARAM_NAME,
  OIDC_ERROR_REDIRECT_URI_PARAM_NAME,
  THIRD_PARTY_APP_ID_PARAM_NAME,
  THIRD_PARTY_APP_STATE_ID_PARAM_NAME,
  APPLICATION_SCOPES_PARAM_NAME,
  SDK_SCRIPT_RESULTS_KEY,
  URL_REDIRECT_MODE_PARAM_NAME,
} from '../constants';
import { EXCLUDED_STATE_KEYS } from '../constants/customScreens';
import {
  AutoFocusOptions,
  CustomScreenState,
  Direction,
  Locale,
  SSOQueryParams,
  StepState,
} from '../types';

const MD_COMPONENTS = ['descope-enriched-text'];

function getUrlParam(paramName: string) {
  const urlParams = new URLSearchParams(window.location.search);

  return urlParams.get(paramName);
}

function getFlowUrlParam() {
  return getUrlParam(URL_RUN_IDS_PARAM_NAME);
}

function setFlowUrlParam(id: string) {
  if (window.history.pushState && id !== getFlowUrlParam()) {
    const newUrl = new URL(window.location.href);
    const search = new URLSearchParams(newUrl.search);
    search.set(URL_RUN_IDS_PARAM_NAME, id);
    newUrl.search = search.toString();
    window.history.pushState({}, '', newUrl.toString());
  }
}

function resetUrlParam(paramName: string) {
  if (window.history.replaceState && getUrlParam(paramName)) {
    const newUrl = new URL(window.location.href);
    const search = new URLSearchParams(newUrl.search);
    search.delete(paramName);
    newUrl.search = search.toString();
    window.history.replaceState({}, '', newUrl.toString());
  }
}

const getFlowIdFromExecId = (executionId: string) => {
  const regex = /(.*)\|#\|.*/;
  return regex.exec(executionId)?.[1] || '';
};

export async function fetchContent<T extends 'text' | 'json'>(
  url: string,
  returnType: T,
): Promise<{
  body: T extends 'json' ? Record<string, any> : string;
  headers: Record<string, string>;
}> {
  const res = await fetch(url, { cache: 'default' });
  if (!res.ok) {
    throw Error(`Error fetching URL ${url} [${res.status}]`);
  }

  return {
    body: await res[returnType || 'text'](),
    headers: Object.fromEntries(res.headers.entries()),
  };
}

const pathJoin = (...paths: string[]) => paths.join('/').replace(/\/+/g, '/'); // preventing duplicate separators

export function getContentUrl({
  projectId,
  filename,
  assetsFolder = ASSETS_FOLDER,
  baseUrl,
}: {
  projectId: string;
  filename: string;
  assetsFolder?: string;
  baseUrl?: string;
}) {
  const url = new URL(OVERRIDE_CONTENT_URL || baseUrl || BASE_CONTENT_URL);
  url.pathname = pathJoin(url.pathname, projectId, assetsFolder, filename);

  return url.toString();
}

export function getAnimationDirection(
  currentIdxStr: string,
  prevIdxStr: string,
) {
  if (!prevIdxStr) return undefined;

  const currentIdx = +currentIdxStr;
  const prevIdx = +prevIdxStr;

  if (Number.isNaN(currentIdx) || Number.isNaN(prevIdx)) return undefined;
  if (currentIdx > prevIdx) return Direction.forward;
  if (currentIdx < prevIdx) return Direction.backward;
  return undefined;
}

export const getRunIdsFromUrl = (flowId: string) => {
  let [executionId = '', stepId = ''] = (getFlowUrlParam() || '').split('_');
  const executionFlowId = getFlowIdFromExecId(executionId);

  // if the flow id does not match, this execution id is not for this flow
  if (!flowId || (executionFlowId && executionFlowId !== flowId)) {
    executionId = '';
    stepId = '';
  }

  return { executionId, stepId, executionFlowId };
};

export const setRunIdsOnUrl = (executionId: string, stepId: string) => {
  setFlowUrlParam([executionId, stepId].join('_'));
};

export function isChromium() {
  return (
    /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor)
  );
}

export function clearRunIdsFromUrl() {
  resetUrlParam(URL_RUN_IDS_PARAM_NAME);
}

export function getTokenFromUrl() {
  return getUrlParam(URL_TOKEN_PARAM_NAME) || undefined;
}

export function clearTokenFromUrl() {
  resetUrlParam(URL_TOKEN_PARAM_NAME);
}

export function getCodeFromUrl() {
  return getUrlParam(URL_CODE_PARAM_NAME) || undefined;
}

export function getIsPopupFromUrl() {
  return getUrlParam(URL_REDIRECT_MODE_PARAM_NAME) === 'popup';
}

export function getExchangeErrorFromUrl() {
  return getUrlParam(URL_ERR_PARAM_NAME) || undefined;
}

export function clearCodeFromUrl() {
  resetUrlParam(URL_CODE_PARAM_NAME);
}

export function clearIsPopupFromUrl() {
  resetUrlParam(URL_REDIRECT_MODE_PARAM_NAME);
}

export function clearExchangeErrorFromUrl() {
  resetUrlParam(URL_ERR_PARAM_NAME);
}

export function getRedirectAuthFromUrl() {
  const redirectAuthCodeChallenge = getUrlParam(
    URL_REDIRECT_AUTH_CHALLENGE_PARAM_NAME,
  );
  const redirectAuthCallbackUrl = getUrlParam(
    URL_REDIRECT_AUTH_CALLBACK_PARAM_NAME,
  );
  const redirectAuthBackupCallbackUri = getUrlParam(
    URL_REDIRECT_AUTH_BACKUP_CALLBACK_PARAM_NAME,
  );
  const redirectAuthInitiator = getUrlParam(
    URL_REDIRECT_AUTH_INITIATOR_PARAM_NAME,
  );
  return {
    redirectAuthCodeChallenge,
    redirectAuthCallbackUrl,
    redirectAuthBackupCallbackUri,
    redirectAuthInitiator,
  };
}

export function getOIDCIDPParamFromUrl() {
  return getUrlParam(OIDC_IDP_STATE_ID_PARAM_NAME);
}

export function clearOIDCIDPParamFromUrl() {
  resetUrlParam(OIDC_IDP_STATE_ID_PARAM_NAME);
}

export function getSAMLIDPParamFromUrl() {
  return getUrlParam(SAML_IDP_STATE_ID_PARAM_NAME);
}

export function clearSAMLIDPParamFromUrl() {
  resetUrlParam(SAML_IDP_STATE_ID_PARAM_NAME);
}

export function getSAMLIDPUsernameParamFromUrl() {
  return getUrlParam(SAML_IDP_USERNAME_PARAM_NAME);
}

export function clearSAMLIDPUsernameParamFromUrl() {
  resetUrlParam(SAML_IDP_USERNAME_PARAM_NAME);
}

export function getDescopeIDPInitiatedParamFromUrl() {
  return getUrlParam(DESCOPE_IDP_INITIATED_PARAM_NAME);
}

export function clearDescopeIDPInitiatedParamFromUrl() {
  resetUrlParam(DESCOPE_IDP_INITIATED_PARAM_NAME);
}

export function getSSOAppIdParamFromUrl() {
  return getUrlParam(SSO_APP_ID_PARAM_NAME);
}

export function getThirdPartyAppIdParamFromUrl() {
  return getUrlParam(THIRD_PARTY_APP_ID_PARAM_NAME);
}

export function clearSSOAppIdParamFromUrl() {
  resetUrlParam(SSO_APP_ID_PARAM_NAME);
}

export function clearThirdPartyAppIdParamFromUrl() {
  resetUrlParam(THIRD_PARTY_APP_ID_PARAM_NAME);
}

export function getThirdPartyAppStateIdParamFromUrl() {
  return getUrlParam(THIRD_PARTY_APP_STATE_ID_PARAM_NAME);
}

export function clearThirdPartyAppStateIdParamFromUrl() {
  resetUrlParam(THIRD_PARTY_APP_STATE_ID_PARAM_NAME);
}

export function getApplicationScopesParamFromUrl() {
  return getUrlParam(APPLICATION_SCOPES_PARAM_NAME);
}

export function clearApplicationScopesParamFromUrl() {
  resetUrlParam(APPLICATION_SCOPES_PARAM_NAME);
}

export function getOIDCLoginHintParamFromUrl() {
  return getUrlParam(OIDC_LOGIN_HINT_PARAM_NAME);
}

export function clearOIDCLoginHintParamFromUrl() {
  resetUrlParam(OIDC_LOGIN_HINT_PARAM_NAME);
}

export function getOIDCPromptParamFromUrl() {
  return getUrlParam(OIDC_PROMPT_PARAM_NAME);
}

export function clearOIDCPromptParamFromUrl() {
  resetUrlParam(OIDC_PROMPT_PARAM_NAME);
}

export function getOIDCErrorRedirectUriParamFromUrl() {
  return getUrlParam(OIDC_ERROR_REDIRECT_URI_PARAM_NAME);
}

export function clearOIDCErrorRedirectUriParamFromUrl() {
  resetUrlParam(OIDC_ERROR_REDIRECT_URI_PARAM_NAME);
}

export function getOIDCResourceParamFromUrl() {
  return getUrlParam(OIDC_RESOURCE_PARAM_NAME);
}

export function clearOIDCResourceParamFromUrl() {
  resetUrlParam(OIDC_RESOURCE_PARAM_NAME);
}

export const camelCase = (s: string) =>
  s.replace(/-./g, (x) => x[1].toUpperCase());

export const createIsChanged =
  <T extends Record<string, any>>(state: T, prevState: T) =>
  (attrName: keyof T) =>
    state[attrName] !== prevState[attrName];

export const getElementDescopeAttributes = (ele: HTMLElement) =>
  Array.from(ele?.attributes || []).reduce((acc, attr) => {
    const descopeAttrName = new RegExp(
      `^${DESCOPE_ATTRIBUTE_PREFIX}(\\S+)$`,
    ).exec(attr.name)?.[1];

    return !descopeAttrName
      ? acc
      : Object.assign(acc, { [descopeAttrName]: attr.value });
  }, {});

export const getFlowConfig = (config: Record<string, any>, flowId: string) =>
  config?.flows?.[flowId] || {};

export const handleUrlParams = (
  flowId: string,
  logger: { debug: (...data: any[]) => void },
) => {
  const { executionId, stepId, executionFlowId } = getRunIdsFromUrl(flowId);

  // if the flow id does not match, we do not want to read & remove any query params
  // because it's probably belongs to another flow
  if (executionFlowId && flowId !== executionFlowId) {
    logger.debug(
      'Flow id does not match the execution flow id, skipping url params handling',
    );
    return { ssoQueryParams: {} };
  }

  if (executionId || stepId) {
    clearRunIdsFromUrl();
  }

  const token = getTokenFromUrl();
  if (token) {
    clearTokenFromUrl();
  }

  const code = getCodeFromUrl();
  if (code) {
    clearCodeFromUrl();
  }

  // this is used for oauth when we want to open the provider login page in a new tab
  const isPopup = getIsPopupFromUrl();
  if (isPopup) {
    clearIsPopupFromUrl();
  }

  const exchangeError = getExchangeErrorFromUrl();
  if (exchangeError) {
    clearExchangeErrorFromUrl();
  }

  // these query params are retained to allow the flow to be refreshed
  // without losing the redirect auth state
  const {
    redirectAuthCodeChallenge,
    redirectAuthCallbackUrl,
    redirectAuthBackupCallbackUri,
    redirectAuthInitiator,
  } = getRedirectAuthFromUrl();

  const oidcIdpStateId = getOIDCIDPParamFromUrl();
  if (oidcIdpStateId) {
    clearOIDCIDPParamFromUrl();
  }

  const samlIdpStateId = getSAMLIDPParamFromUrl();
  if (samlIdpStateId) {
    clearSAMLIDPParamFromUrl();
  }

  const samlIdpUsername = getSAMLIDPUsernameParamFromUrl();
  if (samlIdpStateId) {
    clearSAMLIDPUsernameParamFromUrl();
  }

  const descopeIdpInitiated = getDescopeIDPInitiatedParamFromUrl();
  if (descopeIdpInitiated) {
    clearDescopeIDPInitiatedParamFromUrl();
  }

  const ssoAppId = getSSOAppIdParamFromUrl();
  if (ssoAppId) {
    clearSSOAppIdParamFromUrl();
  }

  const thirdPartyAppId = getThirdPartyAppIdParamFromUrl();
  if (thirdPartyAppId) {
    clearThirdPartyAppIdParamFromUrl();
  }

  const thirdPartyAppStateId = getThirdPartyAppStateIdParamFromUrl();
  if (thirdPartyAppStateId) {
    clearThirdPartyAppStateIdParamFromUrl();
  }

  const applicationScopes = getApplicationScopesParamFromUrl();
  if (applicationScopes) {
    clearApplicationScopesParamFromUrl();
  }

  const oidcLoginHint = getOIDCLoginHintParamFromUrl();
  if (oidcLoginHint) {
    clearOIDCLoginHintParamFromUrl();
  }

  const oidcPrompt = getOIDCPromptParamFromUrl();
  if (oidcPrompt) {
    clearOIDCPromptParamFromUrl();
  }

  const oidcErrorRedirectUri = getOIDCErrorRedirectUriParamFromUrl();
  if (oidcErrorRedirectUri) {
    clearOIDCErrorRedirectUriParamFromUrl();
  }

  const oidcResource = getOIDCResourceParamFromUrl();
  if (oidcResource) {
    clearOIDCResourceParamFromUrl();
  }

  const idpInitiatedVal = descopeIdpInitiated === 'true';

  return {
    executionId,
    stepId,
    token,
    code,
    isPopup,
    exchangeError,
    redirectAuthCodeChallenge,
    redirectAuthCallbackUrl,
    redirectAuthBackupCallbackUri,
    redirectAuthInitiator,
    ssoQueryParams: {
      oidcIdpStateId,
      samlIdpStateId,
      samlIdpUsername,
      descopeIdpInitiated: idpInitiatedVal,
      ssoAppId,
      oidcLoginHint,
      oidcPrompt,
      oidcErrorRedirectUri,
      oidcResource,
      thirdPartyAppId,
      thirdPartyAppStateId,
      applicationScopes,
    },
  };
};

export const loadFont = (url: string) => {
  if (!url) return;

  const font = document.createElement('link');
  font.href = url;
  font.rel = 'stylesheet';
  document.head.appendChild(font);
};

const compareArrays = (array1: any[], array2: any[]) =>
  array1.length === array2.length &&
  array1.every((value: any, index: number) => value === array2[index]);

export const withMemCache = <I extends any[], O>(fn: (...args: I) => O) => {
  let prevArgs: any[];
  let cache: any;
  return Object.assign(
    (...args: I) => {
      if (prevArgs && compareArrays(prevArgs, args)) return cache as O;

      prevArgs = args;
      cache = fn(...args);

      return cache as O;
    },
    {
      reset: () => {
        prevArgs = undefined;
        cache = undefined;
      },
    },
  );
};

export const handleAutoFocus = (
  ele: HTMLElement,
  autoFocus: AutoFocusOptions,
  isFirstScreen: boolean,
) => {
  if (
    autoFocus === true ||
    (autoFocus === 'skipFirstScreen' && !isFirstScreen)
  ) {
    // focus the first visible input
    const firstVisibleInput: HTMLInputElement = ele.querySelector('*[name]');
    setTimeout(() => {
      firstVisibleInput?.focus();
    });
  }
};

export const handleReportValidityOnBlur = (rootEle: HTMLElement) => {
  rootEle.querySelectorAll('*[name]').forEach((ele: HTMLInputElement) => {
    ele.addEventListener('blur', () => {
      const onBlur = () => {
        // reportValidity also focus the element if it's invalid
        // in order to prevent this we need to override the focus method
        const origFocus = ele.focus;
        // eslint-disable-next-line no-param-reassign
        ele.focus = () => {};
        ele.reportValidity?.();
        setTimeout(() => {
          // eslint-disable-next-line no-param-reassign
          ele.focus = origFocus;
        });
      };

      const isInputAlreadyInErrorState = ele.getAttribute('invalid') === 'true';

      if (isInputAlreadyInErrorState || ele.value?.length) {
        onBlur();
        return;
      }

      // If the input is not in an error state, has no value, and a `formnovalidate` button was clicked,
      // we want to prevent triggering validation.
      // This handles a case where a required input was focused, and the user then clicked a social login button —
      // in that case, we don't want the required error message to flash for a split second.
      const ref = { timer: undefined };

      const onClick = (e: MouseEvent) => {
        const target = e.target as HTMLElement;

        if (target.getAttribute('formnovalidate') === 'true') {
          clearTimeout(ref.timer);
          ref.timer = undefined;
        }
      };

      ref.timer = setTimeout(() => {
        rootEle.removeEventListener('click', onClick);
        onBlur();
        ref.timer = undefined;
      }, 150);

      rootEle.addEventListener('click', onClick, { once: true });
    });
  });
};

/**
 * To return a fallback value in case the timeout expires and the promise
 * isn't fulfilled:
 *
 *   const promise = loadUserCount();
 *   const count = await timeoutPromise(2000, promise, 0);
 *
 * Or without a fallback value to just throw an error if the timeout expires:
 *
 *   try {
 *     count = await timeoutPromise(2000, promise);
 *   }
 *
 * Fallback is returned only in case of timeout, so if the passed promise rejects
 * the fallback value is not used, and the returned promise will throw as well.
 */
export function timeoutPromise<T>(
  timeout: number,
  promise: Promise<T>,
  fallback?: T,
): Promise<T> {
  return new Promise((resolve, reject) => {
    let expired = false;
    const timer = setTimeout(() => {
      expired = true;
      if (fallback !== undefined) {
        resolve(fallback);
      } else {
        reject(new Error(`Promise timed out after ${timeout} ms`));
      }
    }, timeout);

    promise
      .then((value) => {
        if (!expired) {
          clearTimeout(timer);
          resolve(value);
        }
      })
      .catch((error) => {
        if (!expired) {
          clearTimeout(timer);
          reject(error);
        }
      });
  });
}

export const getChromiumVersion = (): number => {
  const brands = (navigator as any)?.userAgentData?.brands;
  const found = brands?.find(
    ({ brand, version }) => brand === 'Chromium' && parseFloat(version),
  );
  return found ? found.version : 0;
};

// As an optimization - We can show first screen if we have startScreenId and we don't have any other of the ssoAppId/oidcIdpStateId/samlIdp params
// - If there startScreenId it means that the sdk can show the first screen and we don't need to wait for the sdk to return the first screen
// - If there is any one else of the other params (like oidcIdpStateId, ..) - we can't skip this call because descope may decide not to show the first screen (in cases like a user is already logged in)
export const showFirstScreenOnExecutionInit = (
  startScreenId: string,
  {
    oidcIdpStateId,
    samlIdpStateId,
    samlIdpUsername,
    ssoAppId,
    oidcLoginHint,
    oidcPrompt,
    oidcErrorRedirectUri,
    oidcResource,
    thirdPartyAppId,
    thirdPartyAppStateId,
    applicationScopes,
  }: SSOQueryParams,
): boolean =>
  !!startScreenId &&
  !oidcIdpStateId &&
  !samlIdpStateId &&
  !samlIdpUsername &&
  !ssoAppId &&
  !oidcLoginHint &&
  !oidcPrompt &&
  !oidcErrorRedirectUri &&
  !oidcResource &&
  !thirdPartyAppId &&
  !thirdPartyAppStateId &&
  !applicationScopes;

export const injectSamlIdpForm = (
  url: string,
  samlResponse: string,
  relayState: string,
  submitCallback: (form: HTMLFormElement) => void,
) => {
  const formEle = document.createElement('form');
  formEle.method = 'POST';
  formEle.action = url;
  formEle.innerHTML = `
  <input type="hidden" role="saml-response" name="SAMLResponse" value="${samlResponse}" />
  <input type="hidden" role="saml-relay-state" name="RelayState" value="${relayState}" />
  <input style="display: none;" id="SAMLSubmitButton" type="submit" value="Continue" />
  `;

  document.body.appendChild(formEle);

  submitCallback(formEle);
};

export const submitForm = (formEle: HTMLFormElement) => formEle?.submit();

export const getFirstNonEmptyValue = (obj: object, keys: string[]) => {
  const firstNonEmptyKey = keys.find((key) => obj[key]);
  return firstNonEmptyKey ? obj[firstNonEmptyKey] : null;
};

export const leadingDebounce = <T extends (...args: any[]) => void>(
  func: T,
  wait = 100,
) => {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args) {
    if (!timeout) func.apply(this, args);
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      timeout = null;
    }, wait);
  } as T;
};

export function getUserLocale(locale: string): Locale {
  if (locale) {
    return { locale: locale.toLowerCase(), fallback: locale.toLowerCase() };
  }
  const nl = navigator.language;
  if (!nl) {
    return { locale: '', fallback: '' };
  }

  if (nl.includes('-')) {
    return {
      locale: nl.toLowerCase(),
      fallback: nl.split('-')[0].toLowerCase(),
    };
  }

  return { locale: nl.toLowerCase(), fallback: nl.toLowerCase() };
}

export const clearPreviousExternalInputs = () => {
  document
    .querySelectorAll('[data-hidden-input="true"]')
    .forEach((ele) => ele.remove());
};

export const shouldHandleMarkdown = (compName: string) =>
  MD_COMPONENTS.includes(compName);

const omitBy = <T extends Record<string, any>>(
  obj: T,
  predicate: (value: any, key: keyof T) => boolean,
): T =>
  Object.fromEntries(
    Object.entries(obj).filter(
      ([key, value]) => !predicate(value, key as keyof T),
    ),
  ) as T;

export const transformStepStateForCustomScreen = (
  state: Partial<StepState>,
) => {
  const sanitizedState: CustomScreenState = omitBy(
    state.screenState,
    (_, key) => EXCLUDED_STATE_KEYS.includes(key) || key.startsWith('_'),
  );

  const {
    screenState: { errorText, errorType },
  } = state;

  if (errorText || errorType) {
    sanitizedState.error = { text: errorText, type: errorType };
  }

  if (state.action) {
    sanitizedState.action = state.action;
  }

  if (state.screenState?.componentsConfig?.thirdPartyAppApproveScopes?.data) {
    sanitizedState.inboundAppApproveScopes =
      state.screenState.componentsConfig.thirdPartyAppApproveScopes.data;
  }

  return sanitizedState;
};

export const transformScreenInputs = (inputs: Record<string, any>) => {
  const res = { ...inputs };

  if (inputs.inboundAppApproveScopes) {
    res.thirdPartyAppApproveScopes = inputs.inboundAppApproveScopes;
  }

  return res;
};

export function getScriptResultPath(scriptId: string, resultKey?: string) {
  const path = resultKey ? `${scriptId}_${resultKey}` : scriptId;
  return `${SDK_SCRIPT_RESULTS_KEY}.${path}`;
}

export const openCenteredPopup = (
  url: string,
  title: string,
  w: number,
  h: number,
) => {
  const dualScreenLeft =
    window.screenLeft !== undefined
      ? window.screenLeft
      : (window.screen as any).left;
  const dualScreenTop =
    window.screenTop !== undefined
      ? window.screenTop
      : (window.screen as any).top;

  const width =
    window.innerWidth ||
    document.documentElement.clientWidth ||
    window.screen.width;
  const height =
    window.innerHeight ||
    document.documentElement.clientHeight ||
    window.screen.height;

  const left = (width - w) / 2 + dualScreenLeft;
  const top = (height - h) / 2 + dualScreenTop;

  const popup = window.open(
    '',
    title,
    `width=${w},height=${h},top=${top},left=${left},scrollbars=yes,resizable=yes`,
  );

  popup.location.href = url;
  popup.focus();

  return popup;
};
