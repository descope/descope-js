import { compose } from '../helpers/compose';
import { createSingletonMixin } from '../helpers/mixins';
import { createValidateAttributesMixin } from './createValidateAttributesMixin';

const onMissingAttr = (attrName: string, value: string) =>
  !value && `${attrName} cannot be empty`;

export const attributesMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) => {
    const BaseClass = compose(
      createValidateAttributesMixin({ 'project-id': onMissingAttr }),
    )(superclass);

    return class AttributesMixinClass extends BaseClass {
      get projectId() {
        return this.getAttribute('project-id');
      }
    };
  },
);
