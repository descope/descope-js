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

      /**
       * Base url of the project's hosted auth page, or undefined.
       *
       * Project-level rather than per-widget, because the auth domain belongs to
       * the project. Undefined when the project has no custom domain of its own:
       * the backend omits it rather than publishing the shared Descope host,
       * since that would make a passkey's relying party a host shared across
       * customers. So undefined means popup mode is not available.
       */
      async getHostedPageBaseUrl(): Promise<string | undefined> {
        const config = await this.config;
        return config?.projectConfig?.hostedPageBaseUrl;
      }
    };
  },
);
