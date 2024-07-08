import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import {
  createValidateAttributesMixin,
  staticResourcesMixin,
} from '@descope/sdk-mixins';

const WIDGET_PAGES_BASE_DIR = 'user-profile-widget';

export const fetchWidgetPagesMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) => {
    const BaseClass = compose(
      staticResourcesMixin,
      createValidateAttributesMixin({
        'widget-id': createValidateAttributesMixin.missingAttrValidator,
      }),
    )(superclass);
    return class FetchWidgetPagesMixinClass extends BaseClass {
      get widgetId() {
        return this.getAttribute('widget-id');
      }

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
