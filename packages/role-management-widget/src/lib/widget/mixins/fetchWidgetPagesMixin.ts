import { compose } from '../../helpers/compose';
import { createSingletonMixin } from '../../helpers/mixins';
import { createValidateAttributesMixin } from '../../mixins/createValidateAttributesMixin';
import { missingAttrValidator } from '../../mixins/createValidateAttributesMixin/commonValidators';
import { staticResourcesMixin } from '../../mixins/staticResourcesMixin';

const WIDGET_PAGES_BASE_DIR = 'role-management-widget';

export const fetchWidgetPagesMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) => {
    const BaseClass = compose(
      staticResourcesMixin,
      createValidateAttributesMixin({ 'widget-id': missingAttrValidator }),
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
