/* eslint-disable no-underscore-dangle */
import { createSingletonMixin, compose } from '@descope/sdk-helpers';
import { configMixin } from '../configMixin';
import { createValidateAttributesMixin } from '../createValidateAttributesMixin';
import { descopeUiMixin } from '../descopeUiMixin';
import { initElementMixin } from '../initElementMixin';
import { initLifecycleMixin } from '../initLifecycleMixin';
import { staticResourcesMixin } from '../staticResourcesMixin';
import { DEFAULT_STYLE_ID } from './constants';
import {
  deepMergeNonEmpty,
  flattenToVars,
  loadDevTheme,
  loadFont,
} from './helpers';
import { observeAttributesMixin } from '../observeAttributesMixin';
import { UI_COMPONENTS_URL_KEY } from '../descopeUiMixin/constants';
import { InjectedStyle, injectStyleMixin } from '../injectStyleMixin';
import { tenantIdMixin } from '../tenantIdMixin';

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
      tenantIdMixin,
      staticResourcesMixin,
      initLifecycleMixin,
      descopeUiMixin,
      configMixin,
      initElementMixin,
      observeAttributesMixin,
      injectStyleMixin,
    )(superclass);

    return class ThemeMixinClass extends BaseClass {
      #globalStyle: InjectedStyle;
      #tenantStyle: InjectedStyle;
      #customStyle: InjectedStyle;

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

      get themeOverride(): Record<string, any> | null {
        const raw = this.getAttribute('theme-override');
        if (!raw) return null;
        try {
          return JSON.parse(raw);
        } catch (e) {
          this.logger.error(
            'Failed to parse theme-override attribute. error: ',
            e,
          );
          return null;
        }
      }

      #getThemeOverrideString(): string {
        const override = this.themeOverride;
        if (!override) return '';

        return (['light', 'dark'] as const)
          .map((theme) => {
            const primary = override[theme]?.globals?.colors?.primary;
            const secondary = override[theme]?.globals?.colors?.secondary;
            if (!primary && !secondary) return '';

            return `[data-theme="${theme}"]{${flattenToVars(
              { colors: { primary, secondary } },
              (msg) => this.logger.error(msg),
            )}}`;
          })
          .join('');
      }

      #_themeResource: Promise<void | Record<string, any>>;
      #_tenantThemeResource: Promise<Record<string, any> | undefined>;

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

        return this.#_themeResource;
      }

      async #loadGlobalStyle() {
        const theme = await this.#themeResource;
        if (!theme) {
          return;
        }
        const styles =
          (theme?.light?.globals || '') + (theme?.dark?.globals || '');
        if (!this.#globalStyle) {
          // Use prepend so project global style always precedes tenant style regardless of fetch order
          this.#globalStyle = this.injectStyle(styles, { prepend: true });
        } else {
          this.#globalStyle.replaceSync(styles);
        }
      }

      async #fetchTenantTheme() {
        const tenantId = this.tenantId;
        if (!tenantId) return undefined;
        try {
          const { body: fetchedTenantTheme } = await this.fetchStaticResource(
            `${tenantId}/theme.json`,
            'json',
          );
          return fetchedTenantTheme;
        } catch (e) {
          this.logger.error(
            'Cannot fetch tenant theme file',
            'make sure that your tenantId, projectId & flowId are correct',
          );
        }
        return undefined;
      }

      get #tenantThemeResource(): Promise<Record<string, any> | undefined> {
        if (!this.#_tenantThemeResource) {
          this.#_tenantThemeResource = this.#fetchTenantTheme();
        }
        return this.#_tenantThemeResource;
      }

      async #loadTenantStyle() {
        if (!this.tenantId) {
          this.#tenantStyle?.replaceSync('');
          return;
        }
        const tenantTheme = await this.#tenantThemeResource;
        if (!tenantTheme) {
          this.#tenantStyle?.replaceSync('');
          return;
        }
        const styles =
          (tenantTheme.light?.globals || '') +
          (tenantTheme.dark?.globals || '');
        if (!this.#tenantStyle) {
          this.#tenantStyle = this.injectStyle(styles);
        } else {
          this.#tenantStyle.replaceSync(styles);
        }
      }

      async #loadCustomStyle() {
        if (!this.themeOverride) {
          this.#customStyle?.replaceSync('');
          return;
        }
        const overrideString = this.#getThemeOverrideString();
        if (!this.#customStyle) {
          this.#customStyle = this.injectStyle(overrideString);
        } else {
          this.#customStyle.replaceSync(overrideString);
        }
      }

      async #loadComponentsStyle() {
        const theme = await this.#themeResource;
        if (!theme) return;

        const descopeUi = await this.descopeUi;
        if (!descopeUi?.componentsThemeManager) return;

        const tenantTheme = await this.#tenantThemeResource;

        descopeUi.componentsThemeManager.themes = {
          light: deepMergeNonEmpty(
            theme?.light?.components || {},
            tenantTheme?.light?.components || {},
          ),
          dark: deepMergeNonEmpty(
            theme?.dark?.components || {},
            tenantTheme?.dark?.components || {},
          ),
        };
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

        this.#onThemeChange();
        await Promise.all([
          this.#loadGlobalStyle(),
          this.#loadTenantStyle(),
          this.#loadComponentsStyle(),
        ]);
        this.#loadCustomStyle();

        this.observeAttributes(['theme'], this.#onThemeChange);

        this.observeAttributes(['theme-override'], () =>
          this.#loadCustomStyle(),
        );

        this.observeAttributes(['tenant'], () => {
          this.#_tenantThemeResource = null;
          this.#loadTenantStyle();
          this.#loadComponentsStyle();
        });

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
