import { compose } from '@descope/sdk-helpers';
import { observeAttributesMixin } from '../observeAttributesMixin';
import { initLifecycleMixin } from '../initLifecycleMixin';
import { loggerMixin } from '../loggerMixin';
import { missingAttrValidator } from './commonValidators';

const createValidateAttributesMixin =
  (mappings: Record<string, CheckValueFn | string>) =>
  <T extends CustomElementConstructor>(superclass: T) => {
    const BaseClass = compose(
      loggerMixin,
      initLifecycleMixin,
      observeAttributesMixin,
    )(superclass);
    const mappingsNames = Object.keys(mappings);

    return class ValidateAttributesMixinClass extends BaseClass {
      #handleError(attrName: string, newValue: string | null) {
        const onError = mappings[attrName];

        const error =
          typeof onError === 'function' ? onError(attrName, newValue) : onError;

        if (error) {
          this.logger.error(error);
        }
      }

      constructor(...args: any) {
        super(...args);

        this.observeAttributes(mappingsNames, this.#handleError.bind(this));
      }

      async init() {
        await super.init?.();

        // check attributes initial values
        mappingsNames.forEach((attr) =>
          this.#handleError(attr, this.getAttribute(attr)),
        );
      }
    };
  };

createValidateAttributesMixin.missingAttrValidator = missingAttrValidator;

export type CheckValueFn = (
  attrName: string,
  value: string | null,
) => false | string;

export { createValidateAttributesMixin };
