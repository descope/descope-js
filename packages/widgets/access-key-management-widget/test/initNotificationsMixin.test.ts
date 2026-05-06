/* eslint-disable max-classes-per-file */
import { initNotificationsMixin } from '../src/lib/widget/mixins/initMixin/initComponentsMixins/initNotificationsMixin';

jest.mock('@descope/sdk-mixins', () => ({
  createToastEventsMixin: (config: any) => (superclass: any) =>
    class extends superclass {
      async init() {
        await super.init?.();
        this.subscribe((notifications: any[]) => {
          if (!notifications.length) return;
          notifications.forEach(({ type, msg, detail }: any) => {
            const event = new CustomEvent(config.eventName ?? 'toast', {
              cancelable: true,
              detail: { message: msg, detail, severity: type },
            });
            this.dispatchEvent(event);
            if (event.defaultPrevented) return;
            const n = this.createNotification({
              mode: type,
              duration: 0,
              position: 'bottom-start',
              size: 'sm',
            });
            n.setContent('');
            n.show();
          });
          setTimeout(() => this.actions.clearNotifications());
        }, config.selector);
      }
    },
}));

jest.mock('../src/lib/widget/mixins/stateManagementMixin', () => ({
  stateManagementMixin: (superclass: any) => superclass,
}));

const createMixinInstance = () => {
  let subscribeCallback: ((notifications: any[]) => void) | undefined;
  const mockNotification = { setContent: jest.fn(), show: jest.fn() };
  const mockCreateNotification = jest.fn(() => mockNotification);

  const MixinClass = initNotificationsMixin(
    class extends EventTarget {
      logger = { debug: jest.fn(), error: jest.fn(), info: jest.fn() };

      subscribe = jest.fn((callback: any) => {
        subscribeCallback = callback;
      });

      createNotification = mockCreateNotification;

      actions = { clearNotifications: jest.fn() };

      rootElement = document.createElement('div');
    } as any,
  ) as any;

  const instance = new MixinClass();

  return {
    instance,
    getSubscribeCallback: () => subscribeCallback,
    mockNotification,
    mockCreateNotification,
  };
};

describe('initNotificationsMixin (access-key-management-widget)', () => {
  it('dispatches a toast event and shows notification by default', async () => {
    const {
      instance,
      getSubscribeCallback,
      mockNotification,
      mockCreateNotification,
    } = createMixinInstance();

    await instance.init();

    const toastSpy = jest.fn();
    instance.addEventListener('toast', toastSpy);

    getSubscribeCallback()!([{ type: 'success', msg: 'Key deleted' }]);

    expect(toastSpy).toHaveBeenCalledTimes(1);
    expect(mockCreateNotification).toHaveBeenCalled();
    expect(mockNotification.show).toHaveBeenCalled();
  });

  it('does not show notification when preventDefault is called on the toast event', async () => {
    const {
      instance,
      getSubscribeCallback,
      mockNotification,
      mockCreateNotification,
    } = createMixinInstance();

    await instance.init();

    instance.addEventListener('toast', (e: Event) => e.preventDefault());

    getSubscribeCallback()!([
      { type: 'error', msg: 'Delete failed', detail: 'Server error' },
    ]);

    expect(mockCreateNotification).not.toHaveBeenCalled();
    expect(mockNotification.show).not.toHaveBeenCalled();
  });

  it('dispatches toast event with correct detail payload', async () => {
    const { instance, getSubscribeCallback } = createMixinInstance();

    await instance.init();

    const capturedEvents: CustomEvent[] = [];
    instance.addEventListener('toast', (e: Event) =>
      capturedEvents.push(e as CustomEvent),
    );

    getSubscribeCallback()!([
      { type: 'success', msg: 'Done', detail: 'All good' },
    ]);

    expect(capturedEvents).toHaveLength(1);
    expect(capturedEvents[0].detail).toEqual({
      message: 'Done',
      detail: 'All good',
      severity: 'success',
    });
    expect(capturedEvents[0].cancelable).toBe(true);
  });
});
