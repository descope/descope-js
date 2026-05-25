import { UI_COMPONENTS_URL_KEY } from '../descopeUiMixin/constants';

export const isSafeCssVarSegment = (segment: string): boolean =>
  /^[a-zA-Z0-9-]+$/.test(segment);

export const serializeOverrideCssValue = (value: unknown): string | null => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : null;
  }
  if (typeof value !== 'string') return null;
  if (/[;{}]/.test(value)) return null;
  return value.trim();
};

export const flattenToVars = (
  obj: Record<string, any>,
  onError: (msg: string) => void,
  prefix = '',
): string =>
  Object.entries(obj).reduce((css, [key, value]) => {
    if (!isSafeCssVarSegment(key)) {
      onError('Ignoring invalid override-css token path segment');
      return css;
    }
    const path = prefix ? `${prefix}-${key}` : key;
    if (typeof value === 'object' && value !== null) {
      return css + flattenToVars(value, onError, path);
    }
    const serializedValue = serializeOverrideCssValue(value);
    if (serializedValue === null) {
      onError('Ignoring invalid override-css token value');
      return css;
    }
    return `${css}--descope-${path}:${serializedValue};`;
  }, '');

export const loadFont = (url: string) => {
  const font = document.createElement('link');
  font.href = url;
  font.rel = 'stylesheet';
  document.head.appendChild(font);
};

export const loadDevTheme = async () => {
  const componentsUrl = localStorage.getItem(UI_COMPONENTS_URL_KEY);
  const descopeDevUrl = componentsUrl?.replace(/[^\/]+$/, 'DescopeDev.js');

  // eslint-disable-next-line no-console
  console.warn('Trying to load DescopeDev.js from', descopeDevUrl);
  const scriptEle = document.createElement('script');
  scriptEle.src = descopeDevUrl;
  document.body.appendChild(scriptEle);

  await new Promise((resolve, reject) => {
    scriptEle.onload = resolve;
    scriptEle.onerror = reject;
  });

  if (globalThis.DescopeDev) {
    const { themeToStyle, defaultTheme, darkTheme } = globalThis.DescopeDev;

    return {
      light: themeToStyle(defaultTheme),
      dark: themeToStyle(darkTheme),
    };
  }
};
