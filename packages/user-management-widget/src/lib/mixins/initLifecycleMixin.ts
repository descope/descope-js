import { createSingletonMixin } from '../helpers/mixins';

export const initLifecycleMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class InitLifecycleMixinClass extends superclass {
      #isInit = true;

      connectedCallback() {
        super.connectedCallback?.();

        if (this.shadowRoot?.isConnected) {
          // the init function is running once, on the first time the component is connected
          if (this.#isInit) {
            this.#isInit = false;
            this.init();
          }
        }
      }

      // eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-empty-function
      async init() {}
    },
);
