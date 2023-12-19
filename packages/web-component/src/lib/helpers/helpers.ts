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
  URL_REDIRECT_AUTH_INITIATOR_PARAM_NAME,
  OIDC_IDP_STATE_ID_PARAM_NAME,
  SAML_IDP_STATE_ID_PARAM_NAME,
  SAML_IDP_USERNAME_PARAM_NAME,
  SSO_APP_ID_PARAM_NAME,
} from '../constants';
import { AutoFocusOptions, Direction } from '../types';

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

export function getContentUrl(
  projectId: string,
  filename: string,
  assetsFolder = ASSETS_FOLDER,
) {
  const url = new URL(BASE_CONTENT_URL);
  url.pathname = pathJoin(url.pathname, projectId, assetsFolder, filename);

  return url.toString();
}

export function getAnimationDirection(currentIdx: number, prevIdx: number) {
  if (Number.isNaN(currentIdx) || Number.isNaN(prevIdx)) return undefined;
  if (currentIdx > prevIdx) return Direction.forward;
  if (currentIdx < prevIdx) return Direction.backward;
  return undefined;
}

export const getRunIdsFromUrl = () => {
  const [executionId = '', stepId = ''] = (getFlowUrlParam() || '').split('_');

  return { executionId, stepId };
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

export function getExchangeErrorFromUrl() {
  return getUrlParam(URL_ERR_PARAM_NAME) || undefined;
}

export function clearCodeFromUrl() {
  resetUrlParam(URL_CODE_PARAM_NAME);
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
  const redirectAuthInitiator = getUrlParam(
    URL_REDIRECT_AUTH_INITIATOR_PARAM_NAME,
  );
  return {
    redirectAuthCodeChallenge,
    redirectAuthCallbackUrl,
    redirectAuthInitiator,
  };
}

export function clearRedirectAuthFromUrl() {
  resetUrlParam(URL_REDIRECT_AUTH_CHALLENGE_PARAM_NAME);
  resetUrlParam(URL_REDIRECT_AUTH_CALLBACK_PARAM_NAME);
  resetUrlParam(URL_REDIRECT_AUTH_INITIATOR_PARAM_NAME);
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

export function getSSOAppIdParamFromUrl() {
  return getUrlParam(SSO_APP_ID_PARAM_NAME);
}

export function clearSSOAppIdParamFromUrl() {
  resetUrlParam(SSO_APP_ID_PARAM_NAME);
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

export const handleUrlParams = () => {
  const { executionId, stepId } = getRunIdsFromUrl();
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

  const exchangeError = getExchangeErrorFromUrl();
  if (exchangeError) {
    clearExchangeErrorFromUrl();
  }

  const {
    redirectAuthCodeChallenge,
    redirectAuthCallbackUrl,
    redirectAuthInitiator,
  } = getRedirectAuthFromUrl();
  if (
    redirectAuthCodeChallenge ||
    redirectAuthCallbackUrl ||
    redirectAuthInitiator
  ) {
    clearRedirectAuthFromUrl();
  }

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

  const ssoAppId = getSSOAppIdParamFromUrl();
  if (ssoAppId) {
    clearSSOAppIdParamFromUrl();
  }

  return {
    executionId,
    stepId,
    token,
    code,
    exchangeError,
    redirectAuthCodeChallenge,
    redirectAuthCallbackUrl,
    redirectAuthInitiator,
    oidcIdpStateId,
    samlIdpStateId,
    samlIdpUsername,
    ssoAppId,
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
  return (...args: I) => {
    if (prevArgs && compareArrays(prevArgs, args)) return cache as O;

    prevArgs = args;
    cache = fn(...args);

    return cache as O;
  };
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
  oidcIdpStateId: string,
  samlIdpStateId: string,
  samlIdpUsername: string,
  ssoAppId: string,
): boolean => {
  const optimizeIfMissingOIDCParams = startScreenId && !oidcIdpStateId; // return true if oidcIdpStateId is empty
  const optimizeIfMissingSAMLParams =
    startScreenId && !samlIdpStateId && !samlIdpUsername; // return true if both params are empty
  const optimizeIfMissingSSOParams = startScreenId && !ssoAppId; // return true if ssoAppId is empty

  return (
    optimizeIfMissingOIDCParams &&
    optimizeIfMissingSAMLParams &&
    optimizeIfMissingSSOParams
  );
};

export const getInputValueByType = (input: HTMLInputElement): Promise<any> =>
  new Promise((resolve) => {
    switch (input.type) {
      case 'checkbox': {
        resolve(input.checked);
        break;
      }
      case 'file': {
        const reader = new FileReader();
        if (input.files?.length) {
          reader.onload = (e: any) => {
            const contents = e.target.result;
            resolve(contents);
          };
          reader.readAsDataURL(input.files[0]);
        } else {
          resolve(null);
        }
        break;
      }
      default: {
        resolve(input.value);
      }
    }
  });

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
