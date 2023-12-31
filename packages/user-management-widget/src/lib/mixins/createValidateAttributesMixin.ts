import { compose } from '../helpers/compose';
import { initLifecycleMixin } from './initLifecycleMixin';
import { loggerMixin } from './loggerMixin';

type OnAttrErrorFn = (
  attrName: string,
  value: string | null,
  prevValue: string | null,
) => false | string;

export const createValidateAttributesMixin =
  (mappings: Record<string, OnAttrErrorFn | string>) =>
  <T extends CustomElementConstructor>(superclass: T) => {
    const BaseClass = compose(loggerMixin, initLifecycleMixin)(superclass);
    const mappingsNames = Object.keys(mappings);

    return class ValidateAttributesMixinClass extends BaseClass {
      #handleError(
        attrName: string,
        newValue: string | null,
        oldValue: string | null,
      ) {
        const onError = mappings[attrName];

        const error =
          typeof onError === 'function'
            ? onError(attrName, newValue, oldValue)
            : onError;

        if (error) {
          this.logger.error(error);
        }
      }

      attributeChangedCallback = (
        attrName: string,
        oldValue: string | null,
        newValue: string | null,
      ) => {
        super.attributeChangedCallback?.(attrName, oldValue, newValue);

        if (mappingsNames.indexOf(attrName) !== -1) {
          this.#handleError(attrName, oldValue, newValue);
        }
      };

      async init() {
        await super.init?.();

        mappingsNames.forEach((attrName) =>
          this.#handleError(attrName, this.getAttribute(attrName), null),
        );
      }
    };
  };
