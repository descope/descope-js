/* eslint-disable no-underscore-dangle */
import { createSingletonMixin, compose } from '@descope/sdk-helpers';
import { configMixin } from '../configMixin';
import { createValidateAttributesMixin } from '../createValidateAttributesMixin';
import { descopeUiMixin } from '../descopeUiMixin';
import { initElementMixin } from '../initElementMixin';
import { initLifecycleMixin } from '../initLifecycleMixin';
import { staticResourcesMixin } from '../staticResourcesMixin';
import { DEFAULT_STYLE_ID } from './constants';
import { flattenToVars, loadDevTheme, loadFont } from './helpers';
import { observeAttributesMixin } from '../observeAttributesMixin';
import { UI_COMPONENTS_URL_KEY } from '../descopeUiMixin/constants';
import { InjectedStyle, injectStyleMixin } from '../injectStyleMixin';

const themeValidation = (_: string, theme: string | null) =>
  (theme || false) &&
  theme !== 'light' &&
  theme !== 'dark' &&
  'Supported theme values are "light", "dark", or leave empty for using the OS theme';

const tenantValidation = (_: string, tenant: string | null) =>
  tenant !== null &&
  !/^[A-Za-z0-9_-]+$/.test(tenant) &&
  'Invalid tenant attribute: must contain only alphanumeric characters, hyphens, or underscores';

export type ThemeOptions = 'light' | 'dark' | 'os';

function deepMergeNonEmpty(
  base: Record<string, any>,
  override: Record<string, any>,
): Record<string, any> {
  const merged = { ...base };
  for (const [key, value] of Object.entries(override || {})) {
    if (value === null || value === undefined) continue;
    if (typeof value === 'object') {
      if (Object.keys(value).length === 0) continue;
      merged[key] = deepMergeNonEmpty(merged[key] || {}, value);
    } else if (typeof value === 'string') {
      // Concatenate CSS strings: tenant rules come after project base,
      // so tenant variables override project ones via CSS cascade while
      // project-only variables (e.g. --descope-logo-url) are preserved.
      merged[key] = (merged[key] || '') + value;
    } else {
      merged[key] = value;
    }
  }
  return merged;
}

export const themeMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) => {
    const BaseClass = compose(
      createValidateAttributesMixin({
        theme: themeValidation,
        tenant: tenantValidation,
      }),
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
        if (!this.#globalStyle) {
          this.#globalStyle = this.injectStyle('');
        }

        this.#globalStyle.replaceSync(
          (theme?.light?.globals || '') + (theme?.dark?.globals || ''),
        );
      }

      async #fetchTenantTheme() {
        const tenantId = this.getAttribute('tenant');
        if (!tenantId) return undefined;
        if (tenantValidation('tenant', tenantId)) return undefined;
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
      }

      #mergeComponentThemes(
        base?: Record<string, any>,
        override?: Record<string, any>,
      ): Record<string, any> | undefined {
        if (!base && !override) return undefined;
        const merged = { ...(base || {}) };
        for (const [component, value] of Object.entries(override || {})) {
          if (!value || Object.keys(value).length === 0) continue;
          merged[component] = deepMergeNonEmpty(merged[component] || {}, value);
        }
        return merged;
      }

      async #loadTenantGlobalStyle(tenantTheme?: Record<string, any>) {
        if (!tenantTheme) {
          this.#tenantStyle?.replaceSync('');
          return;
        }
        if (!this.#tenantStyle) {
          this.#tenantStyle = this.injectStyle('');
        }
        this.#tenantStyle.replaceSync(
          (tenantTheme?.light?.globals || '') +
            (tenantTheme?.dark?.globals || ''),
        );
      }

      async #loadTenantComponentsStyle(tenantTheme?: Record<string, any>) {
        if (!tenantTheme) {
          await this.#loadComponentsStyle();
          return;
        }

        const descopeUi = await this.descopeUi;
        if (!descopeUi?.componentsThemeManager) return;

        const projectThemes = await this.#themeResource;
        if (!projectThemes) return;
        descopeUi.componentsThemeManager.themes = {
          light: this.#mergeComponentThemes(
            projectThemes?.light?.components,
            tenantTheme?.light?.components,
          ),
          dark: this.#mergeComponentThemes(
            projectThemes?.dark?.components,
            tenantTheme?.dark?.components,
          ),
        };
      }

      async #loadTenantStyle() {
        const tenantTheme = await this.#fetchTenantTheme();
        await this.#loadTenantGlobalStyle(tenantTheme);
        await this.#loadTenantComponentsStyle(tenantTheme);
      }

      async #loadCustomStyle() {
        if (!this.themeOverride) {
          this.#customStyle?.replaceSync('');
          return;
        }
        if (!this.#customStyle) {
          this.#customStyle = this.injectStyle('');
        }
        this.#customStyle.replaceSync(this.#getThemeOverrideString());
      }

      async #loadComponentsStyle() {
        const theme = await this.#themeResource;
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
          this.#loadComponentsStyle(),
        ]);
        await this.#loadTenantStyle();
        await this.#loadCustomStyle();

        this.observeAttributes(['theme'], this.#onThemeChange);

        this.observeAttributes(['theme-override'], () =>
          this.#loadCustomStyle(),
        );

        this.observeAttributes(['tenant'], () => this.#loadTenantStyle());

        this.observeAttributes(['style-id'], async () => {
          this.#_themeResource = null;
          await Promise.all([
            this.#loadFonts(),
            this.#loadGlobalStyle(),
            this.#loadComponentsStyle(),
          ]);
          await this.#loadTenantStyle();
        });
      }
    };
  },
);
