// Wires the widget to a host mobile SDK via window.descopeBridge — the same
// object descope-wc uses. init() calls descopeBridge.registerWidget(this) so
// native flushes the cached session JWT to localStorage and attaches widget
// lifecycle listeners before the widget reads its session. handleLogout
// dispatches a widget-logout event that native listens for.
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

// Inner mixins may or may not define these; super.*?.() no-ops when absent.
type NativeBridgeSuper = {
  init?(): void | Promise<void>;
  handleLogout?(): void | Promise<void>;
};

export const nativeBridgeMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) => {
    const Base = superclass as T & (new (...args: any[]) => NativeBridgeSuper);
    return class NativeBridgeMixinClass extends Base {
      // Register before super.init so the session JWT and listeners are in place
      // before the inner init reads localStorage or fires an authenticated request.
      async init() {
        if (hasNativeBridge()) {
          window.descopeBridge!.registerWidget!(this);
        }
        await super.init?.();
      }

      // Native mode: fire widget-logout for native to handle. Web mode: fall through.
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
