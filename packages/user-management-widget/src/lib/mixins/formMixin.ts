import { createSingletonMixin } from '../helpers/mixins';

export const formMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class FormMixinClass extends superclass {
      validateForm(rootEle: Element) {
        return this.getFormInputs(rootEle).every(
          (input: HTMLInputElement) => {
            input.reportValidity?.();
            return input.checkValidity?.();
          },
        );
      }

      // eslint-disable-next-line class-methods-use-this
      getFormInputs(rootEle: Element): HTMLInputElement[] {
        return Array.from(rootEle.querySelectorAll('[name]')) as HTMLInputElement[];
      }

      getFormData(rootEle: Element): any {
        return this.getFormInputs(rootEle).reduce((acc, input) => Object.assign(acc, { [input.getAttribute('name')!]: input.value }), {});
      }

      setFormData(rootEle: Element, data: Record<string, any>) {
        this.getFormInputs(rootEle).forEach(input => {
          // eslint-disable-next-line no-param-reassign
          input.value = data[input.getAttribute('name')!];
        });
      }

      resetFormData(rootEle: Element) {
        this.getFormInputs(rootEle).forEach(input => {
          // eslint-disable-next-line no-param-reassign
          input.value = '';
        });
      }
    },
);
