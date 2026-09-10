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

// Rendering a screen that holds a polling element fires the polling interaction, and on a
// start screen that interaction is what calls flow/start. A widget pre-renders its flows
// into closed modals, so that would run the flow - and whatever its polling edges lead to -
// before the user opened anything. See issue 17399.
describe('polling interaction of a hidden flow', () => {
  const setVisibility = (ele: Element, visible: boolean) => {
    Object.assign(ele, { checkVisibility: () => visible });
  };

  // the deferred flow re-checks visibility on a timer
  const becomeVisible = (ele: Element) => {
    setVisibility(ele, true);
    jest.advanceTimersByTime(500);
  };

  const render = (attrs = '') => {
    document.body.innerHTML = `<descope-wc flow-id="sign-in" project-id="1" ${attrs}></descope-wc>`;
    return document.querySelector('descope-wc');
  };

  beforeEach(() => {
    setupWebComponentTestEnv();
  });

  afterEach(() => {
    teardownWebComponentTestEnv();
  });

  const renderPollingScreen = () => {
    fixtures.configContent = {
      flows: { 'sign-in': { version: 1, startScreenId: 'screen-1' } },
      componentsVersion: '1.2.3',
    };
    fixtures.pageContent = '<div data-type="polling">waiting</div>';
    return render();
  };

  it('triggers polling on mount when running natively', async () => {
    startMock.mockReturnValue(generateSdkResponse());

    const ele = renderPollingScreen();
    setVisibility(ele, false);
    // a native webview may never report the element as visible, but its screens still
    // render (bridge v2 hands rendering to the native layer entirely, so v1 here)
    (ele as any).nativeOptions = { platform: 'ios', bridgeVersion: 1 };

    await waitFor(() => expect(startMock).toHaveBeenCalledTimes(1), {
      timeout: WAIT_TIMEOUT,
    });
  });

  // A failed start leaves executionId unset, and the flowState update it triggers re-enters
  // onFlowChange right back into the start branch - so without a guard every failure would
  // re-run the flow's leading actions (issue 17399 all over again, one modal open at a time).
  it('does not trigger polling again after a failed start', async () => {
    startMock.mockReturnValue(
      Promise.resolve({ ok: false, error: { errorCode: 'E102121' } }),
    );

    const ele = renderPollingScreen();
    setVisibility(ele, false);

    await waitFor(
      () => expect(ele.shadowRoot.textContent).toContain('waiting'),
      { timeout: WAIT_TIMEOUT },
    );

    becomeVisible(ele);

    await waitFor(() => expect(startMock).toHaveBeenCalledTimes(1), {
      timeout: WAIT_TIMEOUT,
    });

    // the failure's flowState update re-enters onFlowChange; nothing should start again
    jest.advanceTimersByTime(500);
    await Promise.resolve();

    expect(startMock).toHaveBeenCalledTimes(1);
  });

  // A polling screen is the one screen that starts its own execution: rendering it fires
  // the polling interaction, which on a start screen means calling flow/start. Rendering it
  // into a closed widget modal must not do that.
  it('does not fire the polling interaction of a hidden screen', async () => {
    startMock.mockReturnValue(generateSdkResponse());

    const ele = renderPollingScreen();
    setVisibility(ele, false);

    await waitFor(
      () => expect(ele.shadowRoot.textContent).toContain('waiting'),
      { timeout: WAIT_TIMEOUT },
    );
    expect(startMock).not.toHaveBeenCalled();

    becomeVisible(ele);

    await waitFor(() => expect(startMock).toHaveBeenCalledTimes(1), {
      timeout: WAIT_TIMEOUT,
    });
    // the interaction the polling screen fires, passed as flow/start's interactionId
    expect(startMock.mock.calls[0][3]).toBe('polling');
  });

  // An attribute change is a deliberate restart: BaseDescopeWc clears stepId/executionId,
  // so a flow whose start had failed has to be allowed to start again.
  it('triggers polling again after an attribute change restarts the flow', async () => {
    startMock.mockReturnValue(
      Promise.resolve({ ok: false, error: { errorCode: 'E102121' } }),
    );

    const ele = renderPollingScreen();

    await waitFor(() => expect(startMock).toHaveBeenCalledTimes(1), {
      timeout: WAIT_TIMEOUT,
    });

    ele.setAttribute('locale', 'fr');

    await waitFor(() => expect(startMock).toHaveBeenCalledTimes(2), {
      timeout: WAIT_TIMEOUT,
    });
  });

  it('triggers polling on mount when the browser cannot report visibility', async () => {
    startMock.mockReturnValue(generateSdkResponse());

    const ele = renderPollingScreen();
    expect((ele as any).checkVisibility).toBeUndefined();

    await waitFor(() => expect(startMock).toHaveBeenCalledTimes(1), {
      timeout: WAIT_TIMEOUT,
    });
  });
});
