/* eslint-disable no-underscore-dangle */
import { createSingletonMixin, compose } from '@descope/sdk-helpers';
import { configMixin } from '../configMixin';
import { createValidateAttributesMixin } from '../createValidateAttributesMixin';
import { descopeUiMixin } from '../descopeUiMixin';
import { initElementMixin } from '../initElementMixin';
import { initLifecycleMixin } from '../initLifecycleMixin';
import { staticResourcesMixin } from '../staticResourcesMixin';
import { DEFAULT_STYLE_ID } from './constants';
import { loadDevTheme, loadFont } from './helpers';
import { observeAttributesMixin } from '../observeAttributesMixin';
import { UI_COMPONENTS_URL_KEY } from '../descopeUiMixin/constants';

const themeValidation = (_: string, theme: string | null) =>
  (theme || false) &&
  theme !== 'light' &&
  theme !== 'dark' &&
  'Supported theme values are "light", "dark", or leave empty for using the OS theme';

export type ThemeOptions = 'light' | 'dark' | 'os';

export const themeMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) => {
    const BaseClass = compose(
      createValidateAttributesMixin({ theme: themeValidation }),
      staticResourcesMixin,
      initLifecycleMixin,
      descopeUiMixin,
      configMixin,
      initElementMixin,
      observeAttributesMixin,
    )(superclass);

    return class ThemeMixinClass extends BaseClass {
      #globalStyle: CSSStyleSheet;

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

      get styleId(): string {
        return this.getAttribute('style-id') || DEFAULT_STYLE_ID;
      }

      #_themeResource: Promise<void | Record<string, any>>;

      async #fetchTheme() {
        try {
          const { body: fetchedTheme } = await this.fetchStaticResource(
            `${this.styleId}.json`,
            'json',
          );

          // In development mode, we sometimes want to override the UI components URL
          // The override components might have a different theme, so we need to merge it with the project theme in order to see the components correctly
          if (process.env.NODE_ENV === 'development') {
            if (localStorage?.getItem(UI_COMPONENTS_URL_KEY)) {
              try {
                this.logger.warn(
                  'You are in DEV mode, and UI components override URL was found\ntrying to merge project theme with the default theme of the UI components',
                );
                const devTheme = await loadDevTheme();

                if (devTheme) {
                  fetchedTheme.light.components = {
                    ...fetchedTheme.light.components,
                    ...devTheme.light.components,
                  };
                  fetchedTheme.dark.components = {
                    ...fetchedTheme.dark.components,
                    ...devTheme.dark.components,
                  };

                  this.logger.warn('Theme was merged successfully');

                  // eslint-disable-next-line no-console
                  console.log(
                    '%cNOTICE! This is not the theme that will be used in production!\n\nMake sure to test it without the override UI components URL!',
                    'color: black; background-color:yellow; font-size: x-large',
                  );
                }
              } catch (e) {
                this.logger.error('Failed to merge UI components theme\n', e);
              }
            }
          }

          return fetchedTheme;
        } catch (e) {
          this.logger.error(
            'Cannot fetch theme file',
            'make sure that your projectId & flowId are correct',
          );
        }

        return undefined;
      }

      get #themeResource() {
        if (!this.#_themeResource) {
          this.#_themeResource = this.#fetchTheme();
          this.#_themeResource.then((theme) =>
            this.logger.debug('Fetched theme', theme),
          );
        }

        // eslint-disable-next-line no-underscore-dangle
        return this.#_themeResource;
      }

      async #loadGlobalStyle() {
        const theme = await this.#themeResource;
        if (!theme) return;

        if (!this.#globalStyle) {
          this.#globalStyle = new CSSStyleSheet();
          this.shadowRoot.adoptedStyleSheets ??= [];
          this.shadowRoot.adoptedStyleSheets = [
            ...this.shadowRoot.adoptedStyleSheets,
            this.#globalStyle,
          ];
        }

        this.#globalStyle.replaceSync(
          (theme?.light?.globals || '') + (theme?.dark?.globals || ''),
        );
      }

      async #loadComponentsStyle() {
        const theme = { ...(await this.#themeResource) } as Record<string, any>;
        if (!theme) return;

        const descopeUi = await this.descopeUi;
        if (descopeUi?.componentsThemeManager) {
          descopeUi.componentsThemeManager.themes = {
            light: theme?.light?.components,
            dark: theme?.dark?.components,
          };
        }
      }

      async #getFontsConfig() {
        const { projectConfig } = (await this.config) || {};

        const newConfig = projectConfig?.styles?.[this.styleId];
        const oldConfig = projectConfig?.cssTemplate;

        const config = newConfig || oldConfig;

        const fonts: Record<string, { url?: string }> | undefined =
          config?.[this.theme]?.fonts;

        return fonts;
      }

      async #loadFonts() {
        const fonts = await this.#getFontsConfig();
        if (fonts) {
          Object.values(fonts).forEach((font) => {
            if (font.url) {
              this.logger.debug(`Loading font from URL "${font.url}"`);
              loadFont(font.url);
            }
          });
        } else {
          this.logger.debug('No fonts to load');
        }
      }

      async #applyTheme() {
        this.rootElement.setAttribute('data-theme', this.theme);
        const descopeUi = await this.descopeUi;
        if (descopeUi?.componentsThemeManager) {
          descopeUi.componentsThemeManager.currentThemeName = this.theme;
        }
      }

      #onThemeChange = () => {
        this.#loadTheme();
        this.#toggleOsThemeChangeListener(this.getAttribute('theme') === 'os');
      };

      #loadTheme() {
        this.#loadFonts();
        this.#applyTheme();
      }

      // add or remove os theme change listener
      #toggleOsThemeChangeListener = (listen: boolean) => {
        const method = listen ? 'addEventListener' : 'removeEventListener';
        window
          .matchMedia?.('(prefers-color-scheme: dark)')
          ?.[method]?.('change', () => this.#loadTheme());
      };

      async init() {
        await super.init?.();

        this.#loadGlobalStyle();
        this.#loadComponentsStyle();
        this.#onThemeChange();

        this.observeAttributes(['theme'], this.#onThemeChange);

        this.observeAttributes(['style-id'], () => {
          this.#_themeResource = null;
          this.#loadFonts();
          this.#loadGlobalStyle();
          this.#loadComponentsStyle();
        });
      }
    };
  },
);
