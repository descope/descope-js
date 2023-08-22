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
  returnType: T
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
  assetsFolder = ASSETS_FOLDER
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
    URL_REDIRECT_AUTH_CHALLENGE_PARAM_NAME
  );
  const redirectAuthCallbackUrl = getUrlParam(
    URL_REDIRECT_AUTH_CALLBACK_PARAM_NAME
  );
  const redirectAuthInitiator = getUrlParam(
    URL_REDIRECT_AUTH_INITIATOR_PARAM_NAME
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

export const camelCase = (s: string) =>
  s.replace(/-./g, (x) => x[1].toUpperCase());

export const createIsChanged =
  <T extends Record<string, any>>(state: T, prevState: T) =>
  (attrName: keyof T) =>
    state[attrName] !== prevState[attrName];

export const getElementDescopeAttributes = (ele: HTMLElement) =>
  Array.from(ele?.attributes || []).reduce((acc, attr) => {
    const descopeAttrName = new RegExp(
      `^${DESCOPE_ATTRIBUTE_PREFIX}(\\S+)$`
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
  isFirstScreen: boolean
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

type PromiseExecutor = ConstructorParameters<typeof Promise>[0];

/**
 * timeoutPromise(2000, (resolve, reject) => {// Logic});
 */
export const timeoutPromise = (timeout: number, callback?: PromiseExecutor) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Promise timed out after ${timeout} ms`));
    }, timeout);

    callback?.(
      (value: any) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: any) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });

export const getChromiumVersion = (
  navigator as any
)?.userAgentData?.brands?.find(
  ({ brand, version }) => brand === 'Chromium' && parseFloat(version)
);

// As an optimization - We can show first screen if we have startScreenId and we don't have oidcIdpStateId
// - If there startScreenId it means that the sdk can show the first screen and we don't need to wait for the sdk to return the first screen
// - If there is a oidcIdpStateId - we can't skip this call because the sdk may
export const showFirstScreenOnExecutionInit = (
  startScreenId: string,
  oidcIdpStateId: string
): boolean => startScreenId && !oidcIdpStateId;

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
