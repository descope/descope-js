import { createSingletonMixin } from '../helpers/mixins';
import { loggerMixin } from './loggerMixin';

type ElementOrEmpty = Element | null | undefined;

export const formMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class FormMixinClass extends loggerMixin(superclass) {
      validateForm(rootEle: ElementOrEmpty) {
        return this.getFormInputs(rootEle).every((input: HTMLInputElement) => {
          input.reportValidity?.();
          return input.checkValidity?.();
        });
      }

      // eslint-disable-next-line class-methods-use-this
      getFormInputs(rootEle: ElementOrEmpty): HTMLInputElement[] {
        if (!rootEle) {
          this.logger.debug(
            'cannot get form inputs, no root element was received',
          );
          return [];
        }
        return Array.from(
          rootEle.querySelectorAll('[name]'),
        ) as HTMLInputElement[];
      }

      getFormData(rootEle: ElementOrEmpty): any {
        return this.getFormInputs(rootEle).reduce(
          (acc, input) =>
            Object.assign(acc, { [input.getAttribute('name')!]: input.value }),
          {},
        );
      }

      setFormData(rootEle: ElementOrEmpty, data: Record<string, any>) {
        this.getFormInputs(rootEle).forEach((input) => {
          // eslint-disable-next-line no-prototype-builtins
          if (data.hasOwnProperty(input.getAttribute('name')!)) {
            // eslint-disable-next-line no-param-reassign
            input.value = data[input.getAttribute('name')!];
          }
        });
      }

      resetFormData(rootEle: ElementOrEmpty) {
        this.getFormInputs(rootEle).forEach((input) => {
          // eslint-disable-next-line no-param-reassign
          input.value = '';
        });
      }
    },
);
