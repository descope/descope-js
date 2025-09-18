import { createSingletonMixin, compose } from '@descope/sdk-helpers';
import { missingAttrValidator } from './createValidateAttributesMixin/commonValidators';
import { createValidateAttributesMixin } from './createValidateAttributesMixin';

export const storagePrefixMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) => {
    return class ProjectIdMixinClass extends superclass {
      get storagePrefix() {
        return this.getAttribute('storage-prefix') || '';
      }
    };
  },
);
