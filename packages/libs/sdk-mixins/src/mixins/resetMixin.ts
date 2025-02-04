import { createSingletonMixin, compose } from '@descope/sdk-helpers';
import { missingAttrValidator } from './createValidateAttributesMixin/commonValidators';
import { createValidateAttributesMixin } from './createValidateAttributesMixin';

export const resetMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) => {
    const BaseClass = compose(
      createValidateAttributesMixin({ 'project-id': missingAttrValidator }),
    )(superclass);

    return class ResetMixinClass extends BaseClass {
      #callbacks = new Map<string, () => void>();

      onReset(sectionId: string, callback: () => void | Promise<void>) {
        if (!this.#callbacks.has(sectionId)) {
          this.#callbacks.set(sectionId, callback);
          return () => {
            this.#callbacks.delete(sectionId);
          };
        } else {
          throw new Error(`Callback for sectionId ${sectionId} already exists`);
        }
      }

      async reset(...sectionIds: string[]) {
        if (sectionIds.length === 0) {
          await Promise.all(
            Array.from(this.#callbacks.values()).map((callback) => callback()),
          );
        } else {
          await Promise.all(
            sectionIds.map((sectionId) => {
              if (!this.#callbacks.has(sectionId)) {
                throw new Error(
                  `Callback for sectionId ${sectionId} does not exist`,
                );
              }
              return this.#callbacks.get(sectionId)?.();
            }),
          );
        }
      }
    };
  },
);
