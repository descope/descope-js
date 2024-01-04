import { compose } from '../../helpers/compose';
import { createSingletonMixin } from '../../helpers/mixins';
import { configMixin } from '../configMixin';
import { createValidateAttributesMixin } from '../createValidateAttributesMixin';
import { descopeUiMixin } from '../descopeUiMixin/descopeUiMixin';
import { initElementMixin } from '../initElementMixin';
import { initLifecycleMixin } from '../initLifecycleMixin';
import { staticResourcesMixin } from '../staticResourcesMixin';
import { THEME_FILENAME } from './constants';
import { loadFont } from './helpers';
import mockTheme from './mockTheme';

export type ThemeOptions = 'light' | 'dark' | 'os';

const themeValidation = (_: string, theme: string | null) =>
  (theme || false) &&
  theme !== 'light' &&
  theme !== 'dark' &&
  'Supported theme values are "light", "dark", or leave empty for using the OS theme';

export const themeMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) => {
    const BaseClass = compose(
      createValidateAttributesMixin({ theme: themeValidation }),
      staticResourcesMixin,
      initLifecycleMixin,
      descopeUiMixin,
      configMixin,
      initElementMixin,
    )(superclass);

    return class ThemeMixinClass extends BaseClass {
      get theme(): ThemeOptions {
        const theme = this.getAttribute('theme') as ThemeOptions | null;

        if (theme === 'os') {
          const isOsDark =
            window.matchMedia &&
            window.matchMedia?.('(prefers-color-scheme: dark)')?.matches;

          return isOsDark ? 'dark' : 'light';
        }

        return theme || 'light';
      }

      #_themeResource: Promise<void | Record<string, any>>;

      async #fetchTheme() {
        try {
          const { body } = await this.fetchStaticResource(
            THEME_FILENAME,
            'json',
          );

          return body;
        } catch (e) {
          this.logger.error(
            'Cannot fetch theme file',
            'make sure that your projectId & flowId are correct',
          );
        }

        return undefined;
      }

      get #themeResource() {
        // eslint-disable-next-line no-underscore-dangle
        if (!this.#_themeResource) {
          // eslint-disable-next-line no-underscore-dangle
          this.#_themeResource = this.#fetchTheme();
        }

        // eslint-disable-next-line no-underscore-dangle
        return this.#_themeResource;
      }

      async #loadGlobalStyle() {
        const theme = await this.#themeResource;
        if (!theme) return;

        const styleEle = document.createElement('style');
        styleEle.innerText =
          (theme?.light?.globals || '') + (theme?.dark?.globals || '');

        this.shadowRoot!.appendChild(styleEle);
      }

      async #loadComponentsStyle() {
        // TODO: remove mock
        const theme = { ...await this.#themeResource, ...mockTheme};
        if (!theme) return;

        const descopeUi = await this.descopeUi;
        if (descopeUi?.componentsThemeManager) {
          descopeUi.componentsThemeManager.themes = {
            light: theme?.light?.components,
            dark: theme?.dark?.components,
          };
        }
      }

      async #loadFonts() {
        const { projectConfig } = await this.config;
        const fonts: Record<string, { url?: string }> | undefined =
          projectConfig?.cssTemplate?.[this.theme]?.fonts;
        if (fonts) {
          Object.values(fonts).forEach((font) => {
            if (font.url) {
              this.logger.debug(`Loading font from URL "${font.url}"`);
              loadFont(font.url);
            }
          });
        }
      }

      async #applyTheme() {
        this.rootElement.setAttribute('data-theme', this.theme);
        const descopeUi = await this.descopeUi;
        if (descopeUi?.componentsThemeManager) {
          descopeUi.componentsThemeManager.currentThemeName = this.theme;
        }
      }

      async init() {
        await super.init?.();

        await this.#loadGlobalStyle();
        await this.#loadComponentsStyle();
        await this.#loadFonts();
        await this.#applyTheme();
      }
    };
  },
);
