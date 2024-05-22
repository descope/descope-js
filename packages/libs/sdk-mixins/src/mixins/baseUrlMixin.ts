import { createSingletonMixin } from '@descope/sdk-helpers';

export const baseUrlMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) => {
    return class BaseUrlMixinClass extends superclass {
      get baseUrl() {
        return this.getAttribute('base-url');
      }
    };
  },
);
