/* eslint-disable max-classes-per-file */
import { createAsyncThunk } from '@reduxjs/toolkit';
import { createToastNotificationsMixin } from '../src/mixins/toastNotificationsMixin/toastNotificationsMixin';
import { notifyOn } from '../src/mixins/toastNotificationsMixin/notifyOn';

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
  const mockNotification = { setContent: jest.fn(), show: jest.fn() };
  const mockCreateNotification = jest.fn(() => mockNotification);

  const Mixin = createToastNotificationsMixin({ ...overrides });

  class Base extends EventTarget {
    logger = { debug: jest.fn(), error: jest.fn(), info: jest.fn() };

    createNotification = mockCreateNotification;

    rootElement = document.createElement('div');

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    async init() {}
  }

  const MixinClass = Mixin(Base as any);
  const instance = new MixinClass() as any;
  await instance.init();

  return { instance, mockNotification, mockCreateNotification };
};

describe('createToastNotificationsMixin', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('dispatches a toast event and shows notification by default', async () => {
    const { instance, mockNotification, mockCreateNotification } =
      await setup();

    const toastSpy = jest.fn();
    instance.addEventListener('toast', toastSpy);

    instance.notify({ type: 'success', msg: 'Item created' });

    expect(toastSpy).toHaveBeenCalledTimes(1);
    expect(mockCreateNotification).toHaveBeenCalled();
    expect(mockNotification.show).toHaveBeenCalled();
  });

  it('does not show notification when preventDefault is called', async () => {
    const { instance, mockNotification, mockCreateNotification } =
      await setup();

    instance.addEventListener('toast', (e: Event) => e.preventDefault());

    instance.notify({ type: 'error', msg: 'Failed', detail: 'Server error' });

    expect(mockCreateNotification).not.toHaveBeenCalled();
    expect(mockNotification.show).not.toHaveBeenCalled();
  });

  it('dispatches toast event with correct detail payload', async () => {
    const { instance } = await setup();

    const captured: CustomEvent[] = [];
    instance.addEventListener('toast', (e: Event) =>
      captured.push(e as CustomEvent),
    );

    instance.notify({ type: 'success', msg: 'Done', detail: 'All good' });

    expect(captured).toHaveLength(1);
    expect(captured[0].detail).toEqual({
      message: 'Done',
      detail: 'All good',
      severity: 'success',
    });
    expect(captured[0].cancelable).toBe(true);
  });

  it('shows one notification per toast when given an array', async () => {
    const { instance } = await setup();

    const captured: CustomEvent[] = [];
    instance.addEventListener('toast', (e: Event) =>
      captured.push(e as CustomEvent),
    );

    instance.notify([
      { type: 'success', msg: 'First' },
      { type: 'error', msg: 'Second' },
    ]);

    expect(captured).toHaveLength(2);
    expect(captured[0].detail.message).toBe('First');
    expect(captured[1].detail.message).toBe('Second');
  });

  it('uses a custom eventName when configured', async () => {
    const { instance } = await setup({ eventName: 'my-toast' });

    const captured: string[] = [];
    instance.addEventListener('my-toast', () => captured.push('fired'));
    instance.addEventListener('toast', () => captured.push('wrong'));

    instance.notify({ type: 'success', msg: 'hi' });

    expect(captured).toEqual(['fired']);
  });

  it('renders msg safely via textContent (no HTML injection)', async () => {
    const { instance, mockNotification } = await setup();

    instance.notify({ type: 'error', msg: '<script>alert(1)</script>' });

    const template = mockNotification.setContent.mock.calls[0][0];
    const { textContent } = template.content;
    expect(template).toBeInstanceOf(HTMLTemplateElement);
    // textContent sees the literal characters — they are never parsed as HTML
    expect(textContent).toContain('<script>alert(1)</script>');
  });
});

describe('notifyOn', () => {
  const makeThunk = (name = 'test/action') =>
    createAsyncThunk<any, any>(name, async (arg) => arg);

  const runSettled = (
    thunk: any,
    kind: 'fulfilled' | 'rejected',
    notify: any,
  ) => {
    const result =
      kind === 'fulfilled'
        ? thunk.fulfilled('payload', 'reqId', undefined)
        : thunk.rejected(new Error('boom'), 'reqId', undefined);
    thunk.onSettled(result, { notify });
  };

  it('attaches an onSettled effect to the thunk and returns it', () => {
    const thunk = makeThunk();
    const returned = notifyOn(thunk, { getSuccessMsg: () => 'Done' });

    expect(returned).toBe(thunk);
    expect(typeof (thunk as any).onSettled).toBe('function');
  });

  it('shows a success toast on fulfilled', () => {
    const thunk = makeThunk();
    const notify = jest.fn();
    notifyOn(thunk, { getSuccessMsg: () => 'Done' });

    runSettled(thunk, 'fulfilled', notify);

    expect(notify).toHaveBeenCalledWith({ type: 'success', msg: 'Done' });
  });

  it('shows an error toast on rejected', () => {
    const thunk = makeThunk();
    const notify = jest.fn();
    notifyOn(thunk, {
      getErrorMsg: () => ({ msg: 'Failed', detail: 'boom' }),
    });

    runSettled(thunk, 'rejected', notify);

    expect(notify).toHaveBeenCalledWith({
      type: 'error',
      msg: 'Failed',
      detail: 'boom',
    });
  });

  it('does not notify when the message is empty', () => {
    const thunk = makeThunk();
    const notify = jest.fn();
    notifyOn(thunk, { getSuccessMsg: () => '' });

    runSettled(thunk, 'fulfilled', notify);

    expect(notify).not.toHaveBeenCalled();
  });

  it('does not notify on rejected when no getErrorMsg is provided', () => {
    const thunk = makeThunk();
    const notify = jest.fn();
    notifyOn(thunk, { getSuccessMsg: () => 'Done' });

    runSettled(thunk, 'rejected', notify);

    expect(notify).not.toHaveBeenCalled();
  });
});
