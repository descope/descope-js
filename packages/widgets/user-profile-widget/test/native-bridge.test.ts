import {
  nativeBridgeMixin,
  widgetBridgeVersion,
} from '../src/lib/widget/mixins/nativeBridgeMixin';

const installBridge = (overrides: Partial<{ version: unknown }> = {}): void => {
  (window as any).descopeWidgetBridge = {
    version: widgetBridgeVersion,
    ...overrides,
  };
};

describe('nativeBridgeMixin - method overrides', () => {
  // Minimal base class with init/handleLogout the mixin will wrap.
  // Counters let us assert the super chain ran (or was short-circuited).
  class BaseElement extends HTMLElement {
    superInitCalls = 0;

    superHandleLogoutCalls = 0;

    async init() {
      this.superInitCalls += 1;
    }

    async handleLogout() {
      this.superHandleLogoutCalls += 1;
    }
  }
  const NativeBridgeElement = nativeBridgeMixin(BaseElement);
  if (!customElements.get('test-native-bridge-element')) {
    customElements.define('test-native-bridge-element', NativeBridgeElement);
  }

  let element: any;
  let widgetRegisterListener: jest.Mock;
  let widgetLogoutListener: jest.Mock;

  beforeEach(() => {
    element = document.createElement('test-native-bridge-element');
    document.body.appendChild(element);
    widgetRegisterListener = jest.fn();
    widgetLogoutListener = jest.fn();
    element.addEventListener('widget-register', widgetRegisterListener);
    element.addEventListener('widget-logout', widgetLogoutListener);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    delete (window as any).descopeWidgetBridge;
  });

  describe('init', () => {
    it('calls super.init without a handshake when no bridge is installed', async () => {
      await element.init();
      expect(element.superInitCalls).toBe(1);
      expect(widgetRegisterListener).not.toHaveBeenCalled();
    });

    it('dispatches widget-register and pauses until lazyInit, then calls super.init', async () => {
      installBridge();

      const initPromise = element.init();
      // widget-register fires as part of the handshake setup
      expect(widgetRegisterListener).toHaveBeenCalledTimes(1);
      // super.init must not have run yet - we're parked on the handshake
      expect(element.superInitCalls).toBe(0);

      element.lazyInit();
      await initPromise;
      expect(element.superInitCalls).toBe(1);
    });

    it('engages handshake for older bridge versions (clamp down)', async () => {
      installBridge({ version: Math.max(0, widgetBridgeVersion - 1) });

      const initPromise = element.init();
      expect(widgetRegisterListener).toHaveBeenCalledTimes(1);

      element.lazyInit();
      await initPromise;
      expect(element.superInitCalls).toBe(1);
    });

    it('skips the handshake when the bridge advertises an unsupported version', async () => {
      installBridge({ version: widgetBridgeVersion + 5 });

      await element.init();
      expect(widgetRegisterListener).not.toHaveBeenCalled();
      expect(element.superInitCalls).toBe(1);
    });

    it('skips the handshake when the bridge omits a version field (legacy)', async () => {
      installBridge({ version: undefined });

      await element.init();
      expect(widgetRegisterListener).not.toHaveBeenCalled();
      expect(element.superInitCalls).toBe(1);
    });

    it('lazyInit is a safe no-op outside an active handshake', () => {
      expect(() => element.lazyInit()).not.toThrow();
    });
  });

  describe('handleLogout', () => {
    it('falls through to super.handleLogout in web mode', async () => {
      await element.handleLogout();
      expect(element.superHandleLogoutCalls).toBe(1);
      expect(widgetLogoutListener).not.toHaveBeenCalled();
    });

    it('dispatches widget-logout and short-circuits super in native mode', async () => {
      installBridge();

      await element.handleLogout();
      expect(widgetLogoutListener).toHaveBeenCalledTimes(1);
      expect(element.superHandleLogoutCalls).toBe(0);
    });

    it('falls through to super when the bridge advertises an unsupported version', async () => {
      installBridge({ version: widgetBridgeVersion + 5 });

      await element.handleLogout();
      expect(widgetLogoutListener).not.toHaveBeenCalled();
      expect(element.superHandleLogoutCalls).toBe(1);
    });

    it('falls through to super when the bridge omits a version field (legacy)', async () => {
      installBridge({ version: undefined });

      await element.handleLogout();
      expect(widgetLogoutListener).not.toHaveBeenCalled();
      expect(element.superHandleLogoutCalls).toBe(1);
    });
  });
});
