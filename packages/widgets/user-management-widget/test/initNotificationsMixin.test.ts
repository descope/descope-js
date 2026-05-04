jest.mock('@descope/sdk-helpers', () => {
  const actual = jest.requireActual('@descope/sdk-helpers');
  return {
    ...actual,
    createSingletonMixin: (fn: any) => fn,
  };
});

jest.mock('@descope/sdk-mixins', () => ({
  initLifecycleMixin: (superclass: any) => superclass,
  loggerMixin: (superclass: any) => superclass,
  notificationsMixin: (superclass: any) => superclass,
}));

jest.mock('../src/lib/widget/mixins/stateManagementMixin', () => ({
  stateManagementMixin: (superclass: any) => superclass,
}));

import { initNotificationsMixin } from '../src/lib/widget/mixins/initMixin/initComponentsMixins/initNotificationsMixin';

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
  );

  const instance = new MixinClass();

  return {
    instance,
    getSubscribeCallback: () => subscribeCallback,
    mockNotification,
    mockCreateNotification,
  };
};

describe('initNotificationsMixin', () => {
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

    getSubscribeCallback()!([{ type: 'success', msg: 'User deleted' }]);

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
