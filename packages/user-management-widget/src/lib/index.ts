import { compose } from './helpers/compose';
import { themeMixin } from './mixins/themeMixin';

declare global {
  interface HTMLElement {
    attributeChangedCallback(
      attrName: string,
      oldValue: string | null,
      newValue: string | null,
    ): void;
    connectedCallback(): void;
  }
}

const initMixin = (superclass: CustomElementConstructor) =>
  class InitMixinClass extends compose(themeMixin)(superclass) {
    // eslint-disable-next-line class-methods-use-this
    async getTemplate() {
      const template = document.createElement('template');
      template.innerHTML = `<descope-button mode="primary" variant="contained">Click Me</descope-button>`;

      return template;
    }

    async init() {
      await super.init?.();

      const template = await this.getTemplate();
      await this.loadDescopeUiComponents(template.content);

      this.contentRootElement.append(template.content.cloneNode(true));
    }
  };

customElements.define(
  'user-management-widget',
  compose(initMixin)(HTMLElement),
);
