import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import { staticResourcesMixin, widgetIdMixin } from '@descope/sdk-mixins';

const WIDGET_PAGES_BASE_DIR = 'user-management-widget';

export const fetchWidgetPagesMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) => {
    const BaseClass = compose(staticResourcesMixin, widgetIdMixin)(superclass);
    return class FetchWidgetPagesMixinClass extends BaseClass {
      async fetchWidgetPage(filename: string) {
        const res = await this.fetchStaticResource(
          `${WIDGET_PAGES_BASE_DIR}/${this.widgetId}/${filename}`,
          'text',
        );
        return res.body;
      }
    };
  },
);
