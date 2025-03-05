import { createSingletonMixin } from '@descope/sdk-helpers';

export const cookieConfigMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) => {
    return class CookieConfigMixinClass extends superclass {
      get refreshCookieName() {
        return this.getAttribute('refresh-cookie-name') || '';
      }
    };
  },
);
