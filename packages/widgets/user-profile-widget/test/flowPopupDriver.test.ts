import { FlowPopupDriver } from '@descope/sdk-component-drivers';
import { openCenteredPopup } from '@descope/sdk-helpers';

jest.mock('@descope/sdk-helpers', () => ({
  ...jest.requireActual('@descope/sdk-helpers'),
  openCenteredPopup: jest.fn(),
}));

const openMock = openCenteredPopup as jest.Mock;

const POPUP_ORIGIN = 'https://auth.example.com';
const FLOW_URL = `${POPUP_ORIGIN}/popup-flow.html?flow=add-passkey`;

const logger = {
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

const createFakePopup = () => ({
  closed: false,
  name: '',
  close: jest.fn(),
});

const postFromPopup = (data: any, origin = POPUP_ORIGIN) => {
  window.dispatchEvent(new MessageEvent('message', { data, origin }));
};

describe('FlowPopupDriver', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    openMock.mockReset();
    Object.values(logger).forEach((fn) => fn.mockReset());
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('open', () => {
    it('refuses a malformed url instead of opening a window', () => {
      const driver = new FlowPopupDriver({ logger });

      expect(driver.open('not-a-url')).toBe(false);
      expect(openMock).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalled();
    });

    it('reports a blocked popup rather than pretending it opened', () => {
      openMock.mockReturnValue(null);
      const driver = new FlowPopupDriver({ logger });

      expect(driver.open(FLOW_URL)).toBe(false);
      expect(driver.isOpen).toBe(false);
      expect(logger.warn).toHaveBeenCalled();
    });

    it('names the window at creation so the page can post back', () => {
      openMock.mockReturnValue(createFakePopup());

      new FlowPopupDriver({ logger }).open(FLOW_URL);

      // Must be the name passed to window.open, not assigned afterwards.
      // Assigning after open() looks fine against a fake popup object but is
      // silently refused by a real browser, because by then the window is
      // already navigating to another origin - caught in live testing.
      const [, name] = openMock.mock.calls[0];
      expect(name).toBe(`descope-widget-flow|${window.location.origin}`);
    });
  });

  describe('completion message', () => {
    it('fires onDone for a valid message from the popup origin', () => {
      openMock.mockReturnValue(createFakePopup());
      const driver = new FlowPopupDriver({ logger });
      const onDone = jest.fn();
      driver.onDone(onDone);

      driver.open(FLOW_URL);
      postFromPopup({ action: 'widget-flow-done' });

      expect(onDone).toHaveBeenCalledTimes(1);
    });

    it('ignores a message from a different origin', () => {
      openMock.mockReturnValue(createFakePopup());
      const driver = new FlowPopupDriver({ logger });
      const onDone = jest.fn();
      driver.onDone(onDone);

      driver.open(FLOW_URL);
      postFromPopup({ action: 'widget-flow-done' }, 'https://evil.example.com');

      expect(onDone).not.toHaveBeenCalled();
    });

    it('ignores a message that is not our action', () => {
      openMock.mockReturnValue(createFakePopup());
      const driver = new FlowPopupDriver({ logger });
      const onDone = jest.fn();
      driver.onDone(onDone);

      driver.open(FLOW_URL);
      postFromPopup({ action: 'code', data: { code: 'abc' } });

      expect(onDone).not.toHaveBeenCalled();
    });
  });

  describe('unauthenticated message', () => {
    it('fires onUnauthenticated so the app can sign the user in again', () => {
      openMock.mockReturnValue(createFakePopup());
      const driver = new FlowPopupDriver({ logger });
      const onUnauthenticated = jest.fn();
      driver.onUnauthenticated(onUnauthenticated);

      driver.open(FLOW_URL);
      postFromPopup({ action: 'widget-flow-unauthenticated' });

      expect(onUnauthenticated).toHaveBeenCalledTimes(1);
    });

    it('does not report done - the flow never ran', () => {
      openMock.mockReturnValue(createFakePopup());
      const driver = new FlowPopupDriver({ logger });
      const onDone = jest.fn();
      driver.onDone(onDone);
      driver.onUnauthenticated(jest.fn());

      driver.open(FLOW_URL);
      postFromPopup({ action: 'widget-flow-unauthenticated' });

      expect(onDone).not.toHaveBeenCalled();
    });

    it('ignores it from a different origin', () => {
      openMock.mockReturnValue(createFakePopup());
      const driver = new FlowPopupDriver({ logger });
      const onUnauthenticated = jest.fn();
      driver.onUnauthenticated(onUnauthenticated);

      driver.open(FLOW_URL);
      postFromPopup(
        { action: 'widget-flow-unauthenticated' },
        'https://evil.example.com',
      );

      expect(onUnauthenticated).not.toHaveBeenCalled();
    });

    it('settles once, so the window closing afterwards is not also reported', () => {
      const popup = createFakePopup();
      openMock.mockReturnValue(popup);
      const driver = new FlowPopupDriver({ logger });
      const onUnauthenticated = jest.fn();
      const onClosed = jest.fn();
      driver.onUnauthenticated(onUnauthenticated);
      driver.onClosed(onClosed);

      driver.open(FLOW_URL);
      postFromPopup({ action: 'widget-flow-unauthenticated' });
      popup.closed = true;
      jest.advanceTimersByTime(2000);

      expect(onUnauthenticated).toHaveBeenCalledTimes(1);
      expect(onClosed).not.toHaveBeenCalled();
    });
  });

  describe('the person coming back to the app', () => {
    it('re-checks once, because the flow may have finished out of reach', () => {
      openMock.mockReturnValue(createFakePopup());
      const driver = new FlowPopupDriver({ logger });
      const onFocus = jest.fn();
      driver.onParentFocus(onFocus);

      driver.open(FLOW_URL);
      window.dispatchEvent(new Event('focus'));

      expect(onFocus).toHaveBeenCalledTimes(1);
    });

    it('does not fire again on every alt-tab', () => {
      openMock.mockReturnValue(createFakePopup());
      const driver = new FlowPopupDriver({ logger });
      const onFocus = jest.fn();
      driver.onParentFocus(onFocus);

      driver.open(FLOW_URL);
      window.dispatchEvent(new Event('focus'));
      window.dispatchEvent(new Event('focus'));
      window.dispatchEvent(new Event('focus'));

      expect(onFocus).toHaveBeenCalledTimes(1);
    });

    it('leaves the popup open - the user may be coming back to finish', () => {
      const popup = createFakePopup();
      openMock.mockReturnValue(popup);
      const driver = new FlowPopupDriver({ logger });
      driver.onParentFocus(jest.fn());

      driver.open(FLOW_URL);
      window.dispatchEvent(new Event('focus'));

      expect(popup.close).not.toHaveBeenCalled();
      expect(driver.isOpen).toBe(true);
    });

    it('says nothing once the flow already reported done', () => {
      openMock.mockReturnValue(createFakePopup());
      const driver = new FlowPopupDriver({ logger });
      const onFocus = jest.fn();
      driver.onParentFocus(onFocus);

      driver.open(FLOW_URL);
      postFromPopup({ action: 'widget-flow-done' });
      window.dispatchEvent(new Event('focus'));

      expect(onFocus).not.toHaveBeenCalled();
    });

    it('a second open listens again', () => {
      openMock.mockReturnValue(createFakePopup());
      const driver = new FlowPopupDriver({ logger });
      const onFocus = jest.fn();
      driver.onParentFocus(onFocus);

      driver.open(FLOW_URL);
      window.dispatchEvent(new Event('focus'));
      driver.open(FLOW_URL);
      window.dispatchEvent(new Event('focus'));

      expect(onFocus).toHaveBeenCalledTimes(2);
    });

    it('stops listening once the popup is gone', () => {
      openMock.mockReturnValue(createFakePopup());
      const driver = new FlowPopupDriver({ logger });
      const onFocus = jest.fn();
      driver.onParentFocus(onFocus);

      driver.open(FLOW_URL);
      driver.remove();
      window.dispatchEvent(new Event('focus'));

      expect(onFocus).not.toHaveBeenCalled();
    });
  });

  describe('closing', () => {
    it('fires onClosed when the user closes the window without finishing', () => {
      const popup = createFakePopup();
      openMock.mockReturnValue(popup);
      const driver = new FlowPopupDriver({ logger });
      const onClosed = jest.fn();
      driver.onClosed(onClosed);

      driver.open(FLOW_URL);
      popup.closed = true;
      jest.advanceTimersByTime(1000);

      expect(onClosed).toHaveBeenCalledTimes(1);
    });

    it('close() shuts the window and reports it', () => {
      const popup = createFakePopup();
      openMock.mockReturnValue(popup);
      const driver = new FlowPopupDriver({ logger });
      const onClosed = jest.fn();
      driver.onClosed(onClosed);

      driver.open(FLOW_URL);
      driver.close();

      expect(popup.close).toHaveBeenCalled();
      expect(onClosed).toHaveBeenCalledTimes(1);
    });

    it('settles once, so a close after a done does not double-report', () => {
      const popup = createFakePopup();
      openMock.mockReturnValue(popup);
      const driver = new FlowPopupDriver({ logger });
      const onDone = jest.fn();
      const onClosed = jest.fn();
      driver.onDone(onDone);
      driver.onClosed(onClosed);

      driver.open(FLOW_URL);
      postFromPopup({ action: 'widget-flow-done' });
      popup.closed = true;
      jest.advanceTimersByTime(5000);

      expect(onDone).toHaveBeenCalledTimes(1);
      expect(onClosed).not.toHaveBeenCalled();
    });

    it('stops listening once settled', () => {
      const popup = createFakePopup();
      openMock.mockReturnValue(popup);
      const driver = new FlowPopupDriver({ logger });
      const onDone = jest.fn();
      driver.onDone(onDone);

      driver.open(FLOW_URL);
      postFromPopup({ action: 'widget-flow-done' });
      postFromPopup({ action: 'widget-flow-done' });

      expect(onDone).toHaveBeenCalledTimes(1);
    });

    it('a second open starts fresh', () => {
      const first = createFakePopup();
      openMock.mockReturnValue(first);
      const driver = new FlowPopupDriver({ logger });
      const onDone = jest.fn();
      driver.onDone(onDone);

      driver.open(FLOW_URL);
      postFromPopup({ action: 'widget-flow-done' });

      const second = createFakePopup();
      openMock.mockReturnValue(second);
      driver.open(FLOW_URL);
      postFromPopup({ action: 'widget-flow-done' });

      expect(onDone).toHaveBeenCalledTimes(2);
    });
  });
});
