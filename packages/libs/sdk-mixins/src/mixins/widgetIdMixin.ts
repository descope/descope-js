import { createSingletonMixin, compose } from '@descope/sdk-helpers';
import { missingAttrValidator } from './createValidateAttributesMixin/commonValidators';
import { createValidateAttributesMixin } from './createValidateAttributesMixin';

export const widgetIdMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) => {
    const BaseClass = compose(
      createValidateAttributesMixin({ 'widget-id': missingAttrValidator }),
    )(superclass);

    return class WidgetIdMixinClass extends BaseClass {
      get widgetId() {
        return this.getAttribute('widget-id');
      }
    };
  },
);
