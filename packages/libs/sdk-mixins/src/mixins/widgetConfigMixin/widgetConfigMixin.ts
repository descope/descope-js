import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import { configMixin } from '../configMixin';
import { WidgetConfig } from '../configMixin/types';
import { widgetIdMixin } from '../widgetIdMixin';

export const widgetConfigMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) => {
    const BaseClass = compose(configMixin, widgetIdMixin)(superclass);

    return class WidgetConfigMixinClass extends BaseClass {
      async getWidgetConfig(): Promise<WidgetConfig | undefined> {
        const config = await this.config;
        return config?.projectConfig?.widgets?.[this.widgetId];
      }
    };
  },
);
