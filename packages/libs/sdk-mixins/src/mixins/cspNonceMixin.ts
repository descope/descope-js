import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import { initLifecycleMixin } from './initLifecycleMixin';
import { observeAttributesMixin } from './observeAttributesMixin';

export const cspNonceMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) => {
    const BaseClass = compose(
      initLifecycleMixin,
      observeAttributesMixin,
    )(superclass);

    return class CspNonceMixinClass extends BaseClass {
      get nonce(): string {
        return this.getAttribute('nonce') || '';
      }

      #setNonce() {
        if (this.nonce) {
          (window as any).DESCOPE_NONCE = this.nonce;
        }
      }

      async init() {
        await super.init?.();

        this.observeAttribute('nonce', this.#setNonce.bind(this));
        this.#setNonce();
      }
    };
  },
);
