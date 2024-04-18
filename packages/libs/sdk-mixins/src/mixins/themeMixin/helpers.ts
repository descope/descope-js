import { UI_COMPONENTS_URL_KEY } from '../descopeUiMixin/constants';

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
  await import(descopeDevUrl);

  if (globalThis.DescopeDev) {
    const { themeToStyle, defaultTheme, darkTheme } = globalThis.DescopeDev;

    return {
      light: themeToStyle(defaultTheme),
      dark: themeToStyle(darkTheme),
    };
  }
};
