import { createSingletonMixin, compose } from '@descope/sdk-helpers';
import { missingAttrValidator } from './createValidateAttributesMixin/commonValidators';
import { createValidateAttributesMixin } from './createValidateAttributesMixin';

export const flowIdMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) => {
    const BaseClass = compose(
      createValidateAttributesMixin({ 'flow-id': missingAttrValidator }),
    )(superclass);

    return class FlowIdMixinClass extends BaseClass {
      get flowId() {
        return this.getAttribute('flow-id');
      }
    };
  },
);
