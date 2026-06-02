import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import { configMixin } from '../configMixin';
import { WidgetConfig } from '../configMixin/types';
import { widgetIdMixin } from '../widgetIdMixin';

export const widgetConfigMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) => {
    const BaseClass = compose(configMixin, widgetIdMixin)(superclass);

    return class WidgetConfigMixinClass extends BaseClass {
      // Required: without this empty override, TS infers `init` on the composed
      // base as a property (intersection of identical signatures from multiple
      // mixin paths), and any downstream class declaring `async init()` as a
      // method fails TS2425.
      async init() {
        await super.init?.();
      }

      async getWidgetConfig(): Promise<WidgetConfig | undefined> {
        const config = await this.config;
        return config?.projectConfig?.widgets?.[this.widgetId];
      }

      // The first candidate locale for which the widget has published localized screens
      // (case-insensitive), per the widget's targetLocales in config.json. Returns '' when none
      // match. Callers pass candidates most-specific first (e.g. ['en-us', 'en']) so a region
      // locale falls back to its language, mirroring the web-component's resolution.
      async firstAvailableLocale(candidates: string[]): Promise<string> {
        const widgetConfig = await this.getWidgetConfig();
        const targets = (widgetConfig?.targetLocales ?? []).map((l) =>
          l.toLowerCase(),
        );
        return (
          candidates.find((c) => !!c && targets.includes(c.toLowerCase())) ?? ''
        );
      }

      // Whether the widget has published localized screens for the given locale (case-insensitive),
      // per the widget's targetLocales in config.json.
      async isLocaleAvailable(locale: string): Promise<boolean> {
        if (!locale) return false;
        return (await this.firstAvailableLocale([locale])) !== '';
      }
    };
  },
);
