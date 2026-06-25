// Bridges the User Profile Widget to a host mobile SDK. The host installs
// `window.descopeWidgetBridge`, the per-`<descope-wc>` bridge stays on
// `window.descopeBridge` and is owned by descope-wc itself.
//
// All bridge concerns live here. When composed last in the chain this mixin
// overrides `init()` (to pause for the lazy-init handshake) and `handleLogout()`
// (to delegate to native) from the mixins below it.
import { createSingletonMixin } from '@descope/sdk-helpers';

// Bump when the JS-native widget bridge protocol changes incompatibly.
export const widgetBridgeVersion = 1;

type DescopeWidgetBridge = {
  version?: number;
  registerWidget: (widget: HTMLElement) => void;
  requestLogout: () => void;
  hostInfo?: () => Record<string, unknown>;
};

declare global {
  interface Window {
    descopeWidgetBridge?: DescopeWidgetBridge;
  }
}

// Returns the bridge only when it advertises a version we understand.
// Missing or newer-than-supported version means no bridge.
const getBridge = (): DescopeWidgetBridge | null => {
  const bridge = window.descopeWidgetBridge;
  if (!bridge) return null;
  if (typeof bridge.version !== 'number') return null;
  if (bridge.version > widgetBridgeVersion) return null;
  return bridge;
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
    const Base = superclass as T &
      (new (...args: any[]) => NativeBridgeSuper);
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
      // native when the bridge is installed, else falls back to the web path.
      async handleLogout() {
        const bridge = getBridge();
        if (bridge) {
          bridge.requestLogout();
          return;
        }
        await super.handleLogout?.();
      }

      async #waitForNativeBridge(): Promise<void> {
        const bridge = getBridge();
        if (!bridge) return;
        const promise = new Promise<void>((resolve) => {
          this.#lazyInitResolve = resolve;
        });
        bridge.registerWidget(this);
        await promise;
      }
    };
  },
);
