import {
  FLOW_POPUP_UNAUTHENTICATED_EVENT,
  flowRunnerMixin,
} from '../src/lib/widget/mixins/flowRunnerMixin';

// jsdom 20 ships CSSStyleSheet without replaceSync, and injectStyleMixin calls
// it while the element is being constructed. Nothing here is about styling.
(CSSStyleSheet.prototype as any).replaceSync ??= () => {};

const Base = flowRunnerMixin(
  HTMLElement,
) as unknown as CustomElementConstructor;
customElements.define('flow-runner-refresh-probe', class extends Base {});

const HOSTED_BASE = 'https://auth.example.com/login';

const flowTemplate = () => {
  const template = document.createElement('template');
  template.innerHTML =
    '<descope-wc flow-id="add-passkey" project-id="P2Test"></descope-wc>';
  return template;
};

// Everything stubbed here comes from a mixin that only wires itself up during a
// full widget init, which this test deliberately does not run.
const createEle = async (onFlowPopupClosed: jest.Mock) => {
  const ele: any = document.createElement('flow-runner-refresh-probe');
  Object.defineProperty(ele, 'getWidgetConfig', {
    value: async () => ({ flowTarget: 'popup' }),
  });
  Object.defineProperty(ele, 'getHostedPageBaseUrl', {
    value: async () => HOSTED_BASE,
  });
  Object.defineProperty(ele, 'createFlowTemplate', { value: flowTemplate });
  Object.defineProperty(ele, 'onFlowPopupClosed', { value: onFlowPopupClosed });
  document.body.append(ele);
  await ele.onWidgetRootReady();
  return ele;
};

// The opener check does not stop the flow from running, it only decides whether
// the popup may report back. So a passkey really can be added by a popup that
// then stays silent, and the only thing the app ever hears is the window
// closing. Refreshing the session alone is not enough there: the passkey list
// is fetched by the runner's onSuccess, so it would stay stale until a reload.
describe('a flow popup that closes without reporting', () => {
  let open: jest.SpyInstance;
  let popup: { focus: jest.Mock; closed: boolean; location: { href: string } };

  beforeEach(() => {
    jest.useFakeTimers();
    document.body.innerHTML = '';
    // openCenteredPopup navigates the window it gets back
    popup = { focus: jest.fn(), closed: false, location: { href: '' } };
    open = jest.spyOn(window, 'open').mockReturnValue(popup as any);
  });

  afterEach(() => {
    open?.mockRestore();
    jest.useRealTimers();
  });

  it('refreshes what the flow may have changed, not only the session', async () => {
    const onFlowPopupClosed = jest.fn();
    const onSuccess = jest.fn();
    const ele = await createEle(onFlowPopupClosed);

    ele
      .createFlowRunner({ dataId: 'd', flowId: 'add-passkey', onSuccess })
      .open();
    popup.closed = true;
    jest.advanceTimersByTime(1000);

    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onFlowPopupClosed).toHaveBeenCalledTimes(1);
  });

  it('does the same when the person comes back to the app', async () => {
    const onFlowPopupClosed = jest.fn();
    const onSuccess = jest.fn();
    const ele = await createEle(onFlowPopupClosed);

    ele
      .createFlowRunner({ dataId: 'd', flowId: 'add-passkey', onSuccess })
      .open();
    // a flow can finish in the tab an emailed link opens, where nothing can
    // report back from
    window.dispatchEvent(new Event('focus'));

    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('reports a close once, however late the poll notices', async () => {
    const onFlowPopupClosed = jest.fn();
    const onSuccess = jest.fn();
    const ele = await createEle(onFlowPopupClosed);

    ele
      .createFlowRunner({ dataId: 'd', flowId: 'add-passkey', onSuccess })
      .open();
    popup.closed = true;
    jest.advanceTimersByTime(5000);

    expect(onSuccess).toHaveBeenCalledTimes(1);
  });
});

// `logout` means this window's tokens were cleared. Here they are untouched:
// only the auth domain has no session, which is the normal state for an app
// that signs its users in with an embedded flow. Sending `logout` would tell
// such an app to go to its login page, which would find a live session and
// come straight back.
describe('a flow popup that does not know the user', () => {
  let open: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    document.body.innerHTML = '';
    open = jest.spyOn(window, 'open').mockReturnValue({
      focus: jest.fn(),
      closed: false,
      location: { href: '' },
    } as any);
  });

  afterEach(() => {
    open?.mockRestore();
    jest.useRealTimers();
  });

  const reportUnauthenticated = () => {
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { action: 'widget-flow-unauthenticated' },
        origin: new URL(HOSTED_BASE).origin,
      }),
    );
  };

  it('asks the app to sign the user in, without claiming they were signed out', async () => {
    const ele = await createEle(jest.fn());
    const onSignIn = jest.fn();
    const onLogout = jest.fn();
    ele.addEventListener(FLOW_POPUP_UNAUTHENTICATED_EVENT, onSignIn);
    ele.addEventListener('logout', onLogout);

    ele.createFlowRunner({ dataId: 'd', flowId: 'add-passkey' }).open();
    reportUnauthenticated();

    expect(onSignIn).toHaveBeenCalledTimes(1);
    expect(onLogout).not.toHaveBeenCalled();
  });
});
