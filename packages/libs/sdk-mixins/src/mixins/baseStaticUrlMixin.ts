import { createSingletonMixin } from '@descope/sdk-helpers';

export const baseStaticUrlMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) => {
    return class BaseStaticUrlMixinClass extends superclass {
      get baseStaticUrl() {
        return this.getAttribute('base-static-url');
      }
    };
  },
);
