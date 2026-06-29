// Bridges the User Profile Widget to a host mobile SDK. The host installs
// `window.descopeWidgetBridge` as a presence + version handshake; all
// JS→native widget signals go through CustomEvents dispatched on the widget
// root (`widget-register`, `widget-logout`), mirroring how descope-wc already
// uses `bridge`/`success`/`error` events. The per-`<descope-wc>` bridge for
// component-level native actions stays on `window.descopeBridge` and is
// owned by descope-wc itself.
//
// All bridge concerns live here. When composed last in the chain this mixin
// overrides `init()` (to pause for the lazy-init handshake) and `handleLogout()`
// (to delegate to native) from the mixins below it.
import { createSingletonMixin } from '@descope/sdk-helpers';

// Bump when the JS-native widget bridge protocol changes incompatibly.
export const widgetBridgeVersion = 1;

type DescopeWidgetBridge = {
  version?: number;
};

declare global {
  interface Window {
    descopeWidgetBridge?: DescopeWidgetBridge;
  }
}

// Returns true when native installed a bridge advertising a version we understand.
// Missing or newer-than-supported version means no bridge.
const hasNativeBridge = (): boolean => {
  const bridge = window.descopeWidgetBridge;
  if (!bridge) return false;
  if (typeof bridge.version !== 'number') return false;
  if (bridge.version > widgetBridgeVersion) return false;
  return true;
};

// Tells TypeScript the inner mixins in the compose chain may define these
// methods. Required for `super.init?.()` / `super.handleLogout?.()` to
// type-check; both calls are optional-chained so a missing inner method is
// a runtime no-op.
type NativeBridgeSuper = {
  init?(): void | Promise<void>;
  handleLogout?(): void | Promise<void>;
};

export const nativeBridgeMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) => {
    const Base = superclass as T & (new (...args: any[]) => NativeBridgeSuper);
    return class NativeBridgeMixinClass extends Base {
      #lazyInitResolve?: () => void;

      // Native calls this once the session is seeded; releases the deferred init.
      // Safe no-op when no resolver is registered (web mode, or called twice).
      lazyInit() {
        const resolve = this.#lazyInitResolve;
        this.#lazyInitResolve = undefined;
        resolve?.();
      }

      // Overrides the inner mixins' init(): pauses for native to seed the
      // session before any API call runs, then chains down.
      async init() {
        await this.#waitForNativeBridge();
        await super.init?.();
      }

      // Overrides `initLogoutMixin.handleLogout` when present: routes through
      // native via a widget-logout CustomEvent when the bridge is installed,
      // else falls back to the web path.
      async handleLogout() {
        if (hasNativeBridge()) {
          this.dispatchEvent(new CustomEvent('widget-logout'));
          return;
        }
        await super.handleLogout?.();
      }

      async #waitForNativeBridge(): Promise<void> {
        if (!hasNativeBridge()) return;
        const promise = new Promise<void>((resolve) => {
          this.#lazyInitResolve = resolve;
        });
        this.dispatchEvent(new CustomEvent('widget-register'));
        await promise;
      }
    };
  },
);
