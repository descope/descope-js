import { compose } from '../helpers/compose';
import { createSingletonMixin } from '../helpers/mixins';
import { createValidateAttributesMixin } from './createValidateAttributesMixin';

const onMissingAttr = (attrName: string, value: string | null) =>
  !value && `${attrName} cannot be empty`;

export const projectIdMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) => {
    const BaseClass = compose(
      createValidateAttributesMixin({ 'project-id': onMissingAttr }),
    )(superclass);

    return class ProjectIdMixinClass extends BaseClass {
      get projectId() {
        return this.getAttribute('project-id');
      }
    };
  },
);
