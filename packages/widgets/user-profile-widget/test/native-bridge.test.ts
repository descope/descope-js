import { nativeBridgeMixin } from '../src/lib/widget/mixins/nativeBridgeMixin';

const installBridge = (): void => {
  (window as any).descopeBridge = {
    registerWidget: jest.fn(),
  };
};

describe('nativeBridgeMixin - method overrides', () => {
  // Minimal base class with the methods the mixin will wrap.
  // Counters let us assert the super chain ran (or was short-circuited).
  class BaseElement extends HTMLElement {
    superInitCalls = 0;

    superHandleLogoutCalls = 0;

    widgetConfig: any = { version: 1, flowTarget: 'popup' };

    async init() {
      this.superInitCalls += 1;
    }

    async handleLogout() {
      this.superHandleLogoutCalls += 1;
    }

    async getWidgetConfig() {
      return this.widgetConfig;
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

  describe('getWidgetConfig', () => {
    it('keeps the popup flow target in web mode', async () => {
      expect(await element.getWidgetConfig()).toEqual({
        version: 1,
        flowTarget: 'popup',
      });
    });

    it('forces the modal flow target in native mode', async () => {
      installBridge();

      expect(await element.getWidgetConfig()).toEqual({
        version: 1,
        flowTarget: 'modal',
      });
    });

    it('keeps the popup flow target when bridge lacks registerWidget (legacy)', async () => {
      (window as any).descopeBridge = {};

      expect((await element.getWidgetConfig()).flowTarget).toBe('popup');
    });

    it('leaves a config without a flow target untouched in native mode', async () => {
      installBridge();
      element.widgetConfig = { version: 1 };

      expect(await element.getWidgetConfig()).toEqual({ version: 1 });
    });

    it('passes through a missing config in native mode', async () => {
      installBridge();
      element.widgetConfig = undefined;

      expect(await element.getWidgetConfig()).toBeUndefined();
    });
  });
});
