import { compose } from '@descope/sdk-helpers';
import WebComponent from '@descope/web-component';
import { initMixin } from './mixins/initMixin/initMixin';

declare const BUILD_VERSION: string;

const rootMixin = (superclass: CustomElementConstructor) =>
  class RootMixinClass extends initMixin(superclass) {
    async init() {
      await super.init?.();
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
