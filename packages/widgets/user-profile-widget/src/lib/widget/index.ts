import { compose } from '@descope/sdk-helpers';
import { initMixin } from './mixins/initMixin/initMixin';

declare const BUILD_VERSION: string;

const rootMixin = (superclass: CustomElementConstructor) =>
  // The composed mixin chain is deep enough that TypeScript hits its
  // instantiation-depth limit here (TS2589). Cast the base to a shallow but
  // compatible constructor (HTMLElement + the init hook we call) to stop the
  // deep type inference; runtime behavior is unchanged.
  class RootMixinClass extends (initMixin(superclass) as unknown as new (
    ...args: any[]
  ) => HTMLElement & { init?(): Promise<void> }) {
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
