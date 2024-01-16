import { compose } from '../helpers/compose';
import { initMixin } from './mixins/initMixin';
import { stateUpdateMixin } from './mixins/stateUpdateMixin';

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
    stateUpdateMixin
  )(superclass) { };

export const UserManagementWidget = compose(rootMixin)(HTMLElement);
