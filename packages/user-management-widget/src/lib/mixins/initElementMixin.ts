import { createSingletonMixin } from '../helpers/mixins';

const CONTENT_ROOT_ID = 'content-root';

export const initElementMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class InitElementMixinClass extends superclass {
      contentRootElement: HTMLElement;

      constructor(...rest) {
        super(...rest);

        this.attachShadow({ mode: 'open' }).innerHTML =
          `<div id="${CONTENT_ROOT_ID}"></div>`;
        this.contentRootElement =
          this.shadowRoot?.getElementById(CONTENT_ROOT_ID)!;
      }
    },
);
