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

      // Whether the widget has published localized screens for the given locale (case-insensitive),
      // per the widget's targetLocales in config.json.
      async isLocaleAvailable(locale: string): Promise<boolean> {
        if (!locale) return false;
        const widgetConfig = await this.getWidgetConfig();
        const target = locale.toLowerCase();
        return !!widgetConfig?.targetLocales
          ?.map((l) => l.toLowerCase())
          .includes(target);
      }
    };
  },
);
