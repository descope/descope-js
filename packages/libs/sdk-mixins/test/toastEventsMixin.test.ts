/* eslint-disable max-classes-per-file */
import { createToastEventsMixin } from '../src/mixins/toastEventsMixin/toastEventsMixin';
import { withToastNotifications } from '../src/mixins/toastEventsMixin/withToastNotifications';

jest.mock('@descope/sdk-helpers', () => {
  const actual = jest.requireActual('@descope/sdk-helpers');
  return {
    ...actual,
    createSingletonMixin: (fn: any) => fn,
  };
});

jest.mock('../src/mixins/initLifecycleMixin', () => ({
  initLifecycleMixin: (superclass: any) => superclass,
}));

jest.mock('../src/mixins/loggerMixin', () => ({
  loggerMixin: (superclass: any) => superclass,
}));

jest.mock('../src/mixins/notificationsMixin', () => ({
  notificationsMixin: (superclass: any) => superclass,
}));

const setup = async (overrides: Record<string, any> = {}) => {
  let subscribeCallback: ((notifications: any[]) => void) | undefined;
  const mockNotification = { setContent: jest.fn(), show: jest.fn() };
  const mockCreateNotification = jest.fn(() => mockNotification);
  const clearNotifications = jest.fn();

  const Mixin = createToastEventsMixin({ ...overrides });

  class Base extends EventTarget {
    logger = { debug: jest.fn(), error: jest.fn(), info: jest.fn() };

    subscribe = jest.fn((cb: any) => {
      subscribeCallback = cb;
    });

    createNotification = mockCreateNotification;

    actions = { clearNotifications };

    rootElement = document.createElement('div');

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    async init() {}
  }

  const MixinClass = Mixin(Base as any);
  const instance = new MixinClass() as any;
  await instance.init();

  return {
    instance,
    trigger: (notifications: any[]) => subscribeCallback?.(notifications),
    mockNotification,
    mockCreateNotification,
    clearNotifications,
  };
};

describe('createToastEventsMixin', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('dispatches a toast event and shows notification by default', async () => {
    const { instance, trigger, mockNotification, mockCreateNotification } =
      await setup();

    const toastSpy = jest.fn();
    instance.addEventListener('toast', toastSpy);

    trigger([{ type: 'success', msg: 'Item created' }]);

    expect(toastSpy).toHaveBeenCalledTimes(1);
    expect(mockCreateNotification).toHaveBeenCalled();
    expect(mockNotification.show).toHaveBeenCalled();
  });

  it('does not show notification when preventDefault is called', async () => {
    const { instance, trigger, mockNotification, mockCreateNotification } =
      await setup();

    instance.addEventListener('toast', (e: Event) => e.preventDefault());

    trigger([{ type: 'error', msg: 'Failed', detail: 'Server error' }]);

    expect(mockCreateNotification).not.toHaveBeenCalled();
    expect(mockNotification.show).not.toHaveBeenCalled();
  });

  it('dispatches toast event with correct detail payload', async () => {
    const { instance, trigger } = await setup();

    const captured: CustomEvent[] = [];
    instance.addEventListener('toast', (e: Event) =>
      captured.push(e as CustomEvent),
    );

    trigger([{ type: 'success', msg: 'Done', detail: 'All good' }]);

    expect(captured).toHaveLength(1);
    expect(captured[0].detail).toEqual({
      message: 'Done',
      detail: 'All good',
      severity: 'success',
    });
    expect(captured[0].cancelable).toBe(true);
  });

  it('dispatches one event per notification in the queue', async () => {
    const { instance, trigger } = await setup();

    const captured: CustomEvent[] = [];
    instance.addEventListener('toast', (e: Event) =>
      captured.push(e as CustomEvent),
    );

    trigger([
      { type: 'success', msg: 'First' },
      { type: 'error', msg: 'Second' },
    ]);

    expect(captured).toHaveLength(2);
    expect(captured[0].detail.message).toBe('First');
    expect(captured[1].detail.message).toBe('Second');
  });

  it('schedules clearNotifications after processing', async () => {
    const { trigger, clearNotifications } = await setup();
    trigger([{ type: 'success', msg: 'hi' }]);

    expect(clearNotifications).not.toHaveBeenCalled();
    jest.runAllTimers();
    expect(clearNotifications).toHaveBeenCalledTimes(1);
  });

  it('uses a custom eventName when configured', async () => {
    const { instance, trigger } = await setup({ eventName: 'my-toast' });

    const captured: string[] = [];
    instance.addEventListener('my-toast', () => captured.push('fired'));
    instance.addEventListener('toast', () => captured.push('wrong'));

    trigger([{ type: 'success', msg: 'hi' }]);

    expect(captured).toEqual(['fired']);
  });

  it('skips notification body and clearNotifications for empty queue', async () => {
    const { trigger, mockCreateNotification, clearNotifications } =
      await setup();

    trigger([]);

    expect(mockCreateNotification).not.toHaveBeenCalled();
    jest.runAllTimers();
    expect(clearNotifications).not.toHaveBeenCalled();
  });

  it('escapes HTML in msg before rendering', async () => {
    const { trigger, mockNotification } = await setup();

    trigger([{ type: 'error', msg: '<script>alert(1)</script>' }]);

    expect(mockNotification.setContent).toHaveBeenCalledWith(
      expect.stringContaining('&lt;script&gt;alert(1)&lt;/script&gt;'),
    );
    expect(mockNotification.setContent).not.toHaveBeenCalledWith(
      expect.stringContaining('<script>'),
    );
  });

  it('escapes HTML in detail before rendering', async () => {
    const { trigger, mockNotification } = await setup();

    trigger([
      { type: 'error', msg: 'Failed', detail: '<img src=x onerror=alert(1)>' },
    ]);

    expect(mockNotification.setContent).toHaveBeenCalledWith(
      expect.stringContaining('&lt;img src=x onerror=alert(1)&gt;'),
    );
    expect(mockNotification.setContent).not.toHaveBeenCalledWith(
      expect.stringContaining('<img'),
    );
  });
});

describe('withToastNotifications', () => {
  const makeState = () => ({ notifications: [] as any[] });

  it('pushes success notification with string msg', () => {
    const state = makeState();
    const { onFulfilled } = withToastNotifications({
      getSuccessMsg: () => 'Done',
    });
    onFulfilled(state, {} as any);
    expect(state.notifications).toEqual([{ type: 'success', msg: 'Done' }]);
  });

  it('pushes error notification with object { msg, detail }', () => {
    const state = makeState();
    const { onRejected } = withToastNotifications({
      getErrorMsg: () => ({ msg: 'Failed', detail: 'Some detail' }),
    });
    onRejected(state, {} as any);
    expect(state.notifications).toEqual([
      { type: 'error', msg: 'Failed', detail: 'Some detail' },
    ]);
  });

  it('skips push when getSuccessMsg returns empty string', () => {
    const state = makeState();
    const { onFulfilled } = withToastNotifications({
      getSuccessMsg: () => '',
    });
    onFulfilled(state, {} as any);
    expect(state.notifications).toHaveLength(0);
  });

  it('skips push when getErrorMsg returns undefined', () => {
    const state = makeState();
    const { onRejected } = withToastNotifications({
      getErrorMsg: () => undefined,
    });
    onRejected(state, {} as any);
    expect(state.notifications).toHaveLength(0);
  });

  it('skips push when no getSuccessMsg provided on fulfilled', () => {
    const state = makeState();
    const { onFulfilled } = withToastNotifications({});
    onFulfilled(state, {} as any);
    expect(state.notifications).toHaveLength(0);
  });
});
