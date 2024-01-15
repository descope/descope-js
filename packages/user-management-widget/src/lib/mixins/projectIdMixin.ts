import { compose } from '../helpers/compose';
import { createSingletonMixin } from '../helpers/mixins';
import { missingAttrValidator } from './createValidateAttributesMixin/commonValidators';
import { createValidateAttributesMixin } from './createValidateAttributesMixin';

export const projectIdMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) => {
    const BaseClass = compose(
      createValidateAttributesMixin({ 'project-id': missingAttrValidator }),
    )(superclass);

    return class ProjectIdMixinClass extends BaseClass {
      get projectId() {
        return this.getAttribute('project-id');
      }
    };
  },
);
