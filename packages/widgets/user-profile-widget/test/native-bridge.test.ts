import {
  isNativeBridgeAvailable,
  nativeBridgeMixin,
  requestNativeLogout,
  widgetBridgeVersion,
} from '../src/lib/widget/mixins/nativeBridgeMixin';

const makeBridge = (overrides: Partial<Record<string, unknown>> = {}) => ({
  version: widgetBridgeVersion,
  registerWidget: jest.fn(),
  requestLogout: jest.fn(),
  ...overrides,
});

describe('nativeBridgeMixin - version handshake', () => {
  afterEach(() => {
    delete (window as any).descopeWidgetBridge;
  });

  it('returns false when the bridge is not installed (web mode)', () => {
    expect(isNativeBridgeAvailable()).toBe(false);
  });

  it('returns false when the bridge has no version field (legacy bridge)', () => {
    (window as any).descopeWidgetBridge = makeBridge({ version: undefined });
    expect(isNativeBridgeAvailable()).toBe(false);
  });

  it('returns true when the bridge version matches the UPW build version', () => {
    (window as any).descopeWidgetBridge = makeBridge({
      version: widgetBridgeVersion,
    });
    expect(isNativeBridgeAvailable()).toBe(true);
  });

  it('returns true when the bridge version is older than the UPW build (clamp down)', () => {
    (window as any).descopeWidgetBridge = makeBridge({
      version: Math.max(0, widgetBridgeVersion - 1),
    });
    expect(isNativeBridgeAvailable()).toBe(true);
  });

  it('returns false when the bridge advertises a version newer than this UPW build', () => {
    (window as any).descopeWidgetBridge = makeBridge({
      version: widgetBridgeVersion + 1,
    });
    expect(isNativeBridgeAvailable()).toBe(false);
  });
});

describe('nativeBridgeMixin - class methods', () => {
  // Compose the mixin with a minimal HTMLElement base and register it once for the suite
  class BaseElement extends HTMLElement {}
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

  describe('waitForNativeBridgeIfNeeded', () => {
    it('resolves immediately when no bridge is installed (web mode)', async () => {
      await expect(
        element.waitForNativeBridgeIfNeeded(),
      ).resolves.toBeUndefined();
    });

    it('returns a promise and calls registerWidget when bridge is installed', () => {
      const bridge = makeBridge();
      (window as any).descopeWidgetBridge = bridge;

      const result = element.waitForNativeBridgeIfNeeded();
      expect(result).toBeInstanceOf(Promise);
      expect(bridge.registerWidget).toHaveBeenCalledTimes(1);
      expect(bridge.registerWidget).toHaveBeenCalledWith(element);
    });

    it('resolves the promise once native invokes element.lazyInit()', async () => {
      (window as any).descopeWidgetBridge = makeBridge();

      const promise = element.waitForNativeBridgeIfNeeded() as Promise<void>;
      element.lazyInit();
      await expect(promise).resolves.toBeUndefined();
    });

    it('does not resolve until lazyInit is invoked', async () => {
      (window as any).descopeWidgetBridge = makeBridge();

      const promise = element.waitForNativeBridgeIfNeeded() as Promise<void>;
      const resolvedSentinel = Symbol('resolved');
      const winner = await Promise.race([
        promise.then(() => resolvedSentinel),
        new Promise((r) => {
          setTimeout(() => r('timeout'), 25);
        }),
      ]);
      expect(winner).toBe('timeout');
    });

    it('refuses to engage when the bridge advertises an unsupported version', async () => {
      const bridge = makeBridge({ version: widgetBridgeVersion + 5 });
      (window as any).descopeWidgetBridge = bridge;
      await expect(
        element.waitForNativeBridgeIfNeeded(),
      ).resolves.toBeUndefined();
      expect(bridge.registerWidget).not.toHaveBeenCalled();
    });
  });

});

describe('requestNativeLogout', () => {
  afterEach(() => {
    delete (window as any).descopeWidgetBridge;
  });

  it('is a no-op when no bridge is installed', () => {
    expect(() => requestNativeLogout()).not.toThrow();
  });

  it('calls bridge.requestLogout when the bridge is installed', () => {
    const bridge = {
      version: widgetBridgeVersion,
      registerWidget: jest.fn(),
      requestLogout: jest.fn(),
    };
    (window as any).descopeWidgetBridge = bridge;
    requestNativeLogout();
    expect(bridge.requestLogout).toHaveBeenCalledTimes(1);
  });
});
