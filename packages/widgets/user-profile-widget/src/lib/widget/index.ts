import { compose } from '@descope/sdk-helpers';
import { initMixin } from './mixins/initMixin/initMixin';

declare const BUILD_VERSION: string;

const rootMixin = (superclass: CustomElementConstructor) =>
  class RootMixinClass extends initMixin(superclass) {
    async init() {
      await super.init?.();

      const WebComponent: any =
        customElements.get('descope-wc') ||
        (await import('@descope/web-component').then(
          (module) => module.default,
        ));

      WebComponent.sdkConfigOverrides = {
        baseHeaders: {
          'x-descope-widget-type': 'user-profile-widget',
          'x-descope-widget-id': this.getAttribute('widget-id'),
          'x-descope-widget-version': BUILD_VERSION,
        },
      };
    }
  };

export const UserProfileWidget = compose(rootMixin)(HTMLElement);
