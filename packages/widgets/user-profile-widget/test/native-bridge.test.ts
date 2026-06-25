import {
  nativeBridgeMixin,
  widgetBridgeVersion,
} from '../src/lib/widget/mixins/nativeBridgeMixin';

const makeBridge = (overrides: Partial<Record<string, unknown>> = {}) => ({
  version: widgetBridgeVersion,
  registerWidget: jest.fn(),
  requestLogout: jest.fn(),
  ...overrides,
});

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

  beforeEach(() => {
    element = document.createElement('test-native-bridge-element');
    document.body.appendChild(element);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    delete (window as any).descopeWidgetBridge;
  });

  describe('init', () => {
    it('calls super.init without a handshake when no bridge is installed', async () => {
      await element.init();
      expect(element.superInitCalls).toBe(1);
    });

    it('pauses until lazyInit, then calls super.init', async () => {
      const bridge = makeBridge();
      (window as any).descopeWidgetBridge = bridge;

      const initPromise = element.init();
      // registerWidget runs as part of the handshake setup
      expect(bridge.registerWidget).toHaveBeenCalledWith(element);
      // super.init must not have run yet - we're parked on the handshake
      expect(element.superInitCalls).toBe(0);

      element.lazyInit();
      await initPromise;
      expect(element.superInitCalls).toBe(1);
    });

    it('engages handshake for older bridge versions (clamp down)', async () => {
      const bridge = makeBridge({
        version: Math.max(0, widgetBridgeVersion - 1),
      });
      (window as any).descopeWidgetBridge = bridge;

      const initPromise = element.init();
      expect(bridge.registerWidget).toHaveBeenCalled();

      element.lazyInit();
      await initPromise;
      expect(element.superInitCalls).toBe(1);
    });

    it('skips the handshake when the bridge advertises an unsupported version', async () => {
      const bridge = makeBridge({ version: widgetBridgeVersion + 5 });
      (window as any).descopeWidgetBridge = bridge;

      await element.init();
      expect(bridge.registerWidget).not.toHaveBeenCalled();
      expect(element.superInitCalls).toBe(1);
    });

    it('skips the handshake when the bridge omits a version field (legacy)', async () => {
      const bridge = makeBridge({ version: undefined });
      (window as any).descopeWidgetBridge = bridge;

      await element.init();
      expect(bridge.registerWidget).not.toHaveBeenCalled();
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
    });

    it('calls bridge.requestLogout and short-circuits super in native mode', async () => {
      const bridge = makeBridge();
      (window as any).descopeWidgetBridge = bridge;

      await element.handleLogout();
      expect(bridge.requestLogout).toHaveBeenCalledTimes(1);
      expect(element.superHandleLogoutCalls).toBe(0);
    });

    it('falls through to super when the bridge advertises an unsupported version', async () => {
      const bridge = makeBridge({ version: widgetBridgeVersion + 5 });
      (window as any).descopeWidgetBridge = bridge;

      await element.handleLogout();
      expect(bridge.requestLogout).not.toHaveBeenCalled();
      expect(element.superHandleLogoutCalls).toBe(1);
    });

    it('falls through to super when the bridge omits a version field (legacy)', async () => {
      const bridge = makeBridge({ version: undefined });
      (window as any).descopeWidgetBridge = bridge;

      await element.handleLogout();
      expect(bridge.requestLogout).not.toHaveBeenCalled();
      expect(element.superHandleLogoutCalls).toBe(1);
    });
  });
});
