import { compose } from '../helpers/compose';
import { initMixin } from './mixins/initMixin/initMixin';

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

const rootMixin = (superclass: CustomElementConstructor) =>
  class RootMixinClass extends compose(
    initMixin,
  )(superclass) { };

export const UserManagementWidget = compose(rootMixin)(HTMLElement);
