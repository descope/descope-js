// Allows User Profile Widget to work within a host mobile SDK.
import { createSingletonMixin } from '@descope/sdk-helpers';

type DescopeBridge = {
  registerWidget?: (widget: unknown) => void;
};

declare global {
  interface Window {
    descopeBridge?: DescopeBridge;
  }
}

const hasNativeBridge = (): boolean =>
  typeof window.descopeBridge?.registerWidget === 'function';

type NativeBridgeSuper = {
  init?(): void | Promise<void>;
  handleLogout?(): void | Promise<void>;
};

export const nativeBridgeMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) => {
    const Base = superclass as T & (new (...args: any[]) => NativeBridgeSuper);
    return class NativeBridgeMixinClass extends Base {
      // make sure bridge is registered before the widget initializes
      // to allow the native SDK to properly set the state
      async init() {
        if (hasNativeBridge()) {
          window.descopeBridge!.registerWidget!(this);
        }
        await super.init?.();
      }

      // native SDK owns the logout behavior
      async handleLogout() {
        if (hasNativeBridge()) {
          this.dispatchEvent(new CustomEvent('widget-logout'));
          return;
        }
        await super.handleLogout?.();
      }
    };
  },
);
