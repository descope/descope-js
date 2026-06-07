// Bridges the User Profile Widget to a host mobile SDK. The host installs
// `window.descopeWidgetBridge`, the per-`<descope-wc>` bridge stays on
// `window.descopeBridge` and is owned by descope-wc itself.
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

export const isNativeBridgeAvailable = (): boolean => {
  const bridge = window.descopeWidgetBridge;
  if (!bridge) return false;
  if (typeof bridge.version !== 'number') return false;
  return bridge.version <= widgetBridgeVersion;
};

const getBridge = (): DescopeWidgetBridge | null =>
  isNativeBridgeAvailable() ? window.descopeWidgetBridge! : null;

// In native mode the host SDK owns logout; callers gate with
// `isNativeBridgeAvailable()` before invoking.
export const requestNativeLogout = () => {
  getBridge()?.requestLogout();
};

export const nativeBridgeMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class NativeBridgeMixinClass extends superclass {
      #lazyInitResolve?: () => void;

      // Native calls this once the session is seeded; releases the deferred init.
      // Safe no-op when no resolver is registered (web mode, or called twice).
      lazyInit() {
        const resolve = this.#lazyInitResolve;
        this.#lazyInitResolve = undefined;
        resolve?.();
      }

      // Pauses init until native invokes `widget.lazyInit()`. Resolves
      // immediately in web mode so the caller falls through.
      async waitForNativeBridgeIfNeeded(): Promise<void> {
        const bridge = getBridge();
        if (!bridge) return;
        const promise = new Promise<void>((resolve) => {
          this.#lazyInitResolve = resolve;
        });
        bridge.registerWidget(this);
        await promise;
      }
    },
);
