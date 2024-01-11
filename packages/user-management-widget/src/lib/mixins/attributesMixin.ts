import { compose } from '../helpers/compose';
import { createSingletonMixin } from '../helpers/mixins';
import { createValidateAttributesMixin } from './createValidateAttributesMixin';

const onMissingAttr = (attrName: string, value: string | null) =>
  !value && `${attrName} cannot be empty`;

//TODO: change to mixin creator?
export const attributesMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) => {
    const BaseClass = compose(
      createValidateAttributesMixin({ 'project-id': onMissingAttr }),
    )(superclass);

    return class AttributesMixinClass extends BaseClass {
      get projectId() {
        return this.getAttribute('project-id');
      }

      get baseUrl() {
        return this.getAttribute('base-url');
      }

      get mgmtKey() {
        return this.getAttribute('mgmt-key');
      }
    };
  },
);
