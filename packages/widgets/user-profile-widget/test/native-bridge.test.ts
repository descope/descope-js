import { nativeBridgeMixin } from '../src/lib/widget/mixins/nativeBridgeMixin';

const installBridge = (): void => {
  (window as any).descopeBridge = {
    registerWidget: jest.fn(),
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
  let widgetLogoutListener: jest.Mock;

  beforeEach(() => {
    element = document.createElement('test-native-bridge-element');
    document.body.appendChild(element);
    widgetLogoutListener = jest.fn();
    element.addEventListener('widget-logout', widgetLogoutListener);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    delete (window as any).descopeBridge;
  });

  describe('init', () => {
    it('calls super.init without registering when no bridge is installed', async () => {
      await element.init();
      expect(element.superInitCalls).toBe(1);
    });

    it('registers with native then chains to super.init', async () => {
      installBridge();

      await element.init();

      expect((window as any).descopeBridge.registerWidget).toHaveBeenCalledWith(
        element,
      );
      expect(element.superInitCalls).toBe(1);
    });

    it('skips registration when bridge lacks registerWidget (legacy)', async () => {
      (window as any).descopeBridge = {};

      await element.init();
      expect(element.superInitCalls).toBe(1);
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

    it('falls through to super when bridge lacks registerWidget (legacy)', async () => {
      (window as any).descopeBridge = {};

      await element.handleLogout();
      expect(widgetLogoutListener).not.toHaveBeenCalled();
      expect(element.superHandleLogoutCalls).toBe(1);
    });
  });
});
