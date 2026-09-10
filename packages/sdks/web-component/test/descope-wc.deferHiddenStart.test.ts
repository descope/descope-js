/* eslint-disable import/order, max-classes-per-file, class-methods-use-this */
// @ts-nocheck

import {
  setupWebComponentTestEnv,
  teardownWebComponentTestEnv,
  startMock,
  generateSdkResponse,
  fixtures,
  WAIT_TIMEOUT,
} from './descope-wc.test-harness';

import '@testing-library/jest-dom';
import { waitFor } from '@testing-library/dom';

import '../src/lib/descope-wc';

// A flow with no start screen cannot render anything locally, so starting it is the only
// way to get the first screen - and starting runs the flow's first node. When that node is
// an action (send SMS, HTTP connector, ...), starting a flow the user cannot see executes
// it without any user intent. See issue 17399.
describe('deferring the start of a hidden flow', () => {
  let observerCallbacks: (() => void)[];

  const setVisibility = (ele: Element, visible: boolean) => {
    Object.assign(ele, { checkVisibility: () => visible });
  };

  const becomeVisible = (ele: Element) => {
    setVisibility(ele, true);
    observerCallbacks.forEach((cb) => cb());
  };

  const render = (attrs = '') => {
    document.body.innerHTML = `<descope-wc flow-id="sign-in" project-id="1" ${attrs}></descope-wc>`;
    return document.querySelector('descope-wc');
  };

  beforeEach(() => {
    setupWebComponentTestEnv();

    observerCallbacks = [];
    // jsdom has no ResizeObserver - collect the callbacks so the test can fire them
    global.ResizeObserver = class {
      constructor(cb: () => void) {
        observerCallbacks.push(cb);
      }

      observe() {}

      disconnect() {}
    } as any;
  });

  afterEach(() => {
    teardownWebComponentTestEnv();
    delete global.ResizeObserver;
  });

  it('does not start a flow while it is hidden', async () => {
    startMock.mockReturnValue(generateSdkResponse());

    const ele = render();
    setVisibility(ele, false);

    // the observer being armed means onFlowChange reached the start branch and deferred
    await waitFor(() => expect(observerCallbacks.length).toBeGreaterThan(0), {
      timeout: WAIT_TIMEOUT,
    });

    expect(startMock).not.toHaveBeenCalled();
  });

  it('starts the flow once it becomes visible', async () => {
    startMock.mockReturnValue(generateSdkResponse());

    const ele = render();
    setVisibility(ele, false);

    await waitFor(() => expect(observerCallbacks.length).toBeGreaterThan(0), {
      timeout: WAIT_TIMEOUT,
    });
    expect(startMock).not.toHaveBeenCalled();

    becomeVisible(ele);

    await waitFor(() => expect(startMock).toHaveBeenCalledTimes(1), {
      timeout: WAIT_TIMEOUT,
    });
  });

  it('starts a hidden flow immediately when running natively', async () => {
    startMock.mockReturnValue(generateSdkResponse());

    const ele = render();
    setVisibility(ele, false);
    // the native layer renders screens itself, so its flow element is never visible
    (ele as any).nativeOptions = { platform: 'ios', bridgeVersion: 2 };

    await waitFor(() => expect(startMock).toHaveBeenCalledTimes(1), {
      timeout: WAIT_TIMEOUT,
    });
  });

  // A failed start leaves executionId unset, and the flowState update it triggers re-enters
  // onFlowChange right back into the start branch - so without a guard every failure would
  // re-run the flow's leading actions (issue 17399 all over again, one modal open at a time).
  it('does not retry a start that failed', async () => {
    startMock.mockReturnValue(
      Promise.resolve({ ok: false, error: { errorCode: 'E102121' } }),
    );

    const ele = render();
    setVisibility(ele, false);

    await waitFor(() => expect(observerCallbacks.length).toBeGreaterThan(0), {
      timeout: WAIT_TIMEOUT,
    });

    becomeVisible(ele);

    await waitFor(() => expect(startMock).toHaveBeenCalledTimes(1), {
      timeout: WAIT_TIMEOUT,
    });

    // the failure's flowState update re-enters onFlowChange; nothing should start again
    observerCallbacks.forEach((cb) => cb());
    await Promise.resolve();

    expect(startMock).toHaveBeenCalledTimes(1);
  });

  // A polling screen is the one screen that starts its own execution: rendering it fires
  // the polling interaction, which on a start screen means calling flow/start. Rendering it
  // into a closed widget modal must not do that.
  it('does not fire the polling interaction of a hidden screen', async () => {
    startMock.mockReturnValue(generateSdkResponse());
    fixtures.configContent = {
      flows: { 'sign-in': { version: 1, startScreenId: 'screen-1' } },
      componentsVersion: '1.2.3',
    };
    fixtures.pageContent = '<div data-type="polling">waiting</div>';

    const ele = render();
    setVisibility(ele, false);

    await waitFor(() => expect(observerCallbacks.length).toBeGreaterThan(0), {
      timeout: WAIT_TIMEOUT,
    });
    expect(startMock).not.toHaveBeenCalled();

    becomeVisible(ele);

    await waitFor(() => expect(startMock).toHaveBeenCalledTimes(1), {
      timeout: WAIT_TIMEOUT,
    });
    // the interaction the polling screen fires, passed as flow/start's interactionId
    expect(startMock.mock.calls[0][3]).toBe('polling');
  });

  it('starts on mount when the browser cannot report visibility', async () => {
    startMock.mockReturnValue(generateSdkResponse());

    const ele = render();
    expect((ele as any).checkVisibility).toBeUndefined();

    await waitFor(() => expect(startMock).toHaveBeenCalledTimes(1), {
      timeout: WAIT_TIMEOUT,
    });
  });
});
