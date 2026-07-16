// Bridges the User Profile Widget to a host mobile SDK. Native installs
// `window.descopeBridge` — the same object descope-wc uses for per-component
// signals. The widget calls `descopeBridge.registerWidget(this)` from init(),
// which seeds the session and attaches widget-lifecycle listeners in one step.
// Logout goes through a `widget-logout` CustomEvent that native subscribes to
// during registration.
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

// Tells TypeScript the inner mixins in the compose chain may define these
// methods. `super.init?.()` / `super.handleLogout?.()` optional-chain so a
// missing inner method is a runtime no-op.
type NativeBridgeSuper = {
  init?(): void | Promise<void>;
  handleLogout?(): void | Promise<void>;
};

export const nativeBridgeMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) => {
    const Base = superclass as T & (new (...args: any[]) => NativeBridgeSuper);
    return class NativeBridgeMixinClass extends Base {
      // Registers with native (session seed + lifecycle listeners) before the
      // inner init reads localStorage or fires an authenticated request.
      async init() {
        if (hasNativeBridge()) {
          window.descopeBridge!.registerWidget!(this);
        }
        await super.init?.();
      }

      // Native mode: dispatch a widget-logout event that native subscribes to.
      // Web mode: fall through to the built-in logout flow.
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
