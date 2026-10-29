import { flowPopupSessionMixin } from '../src/lib/widget/mixins/flowPopupSessionMixin';

const Base = flowPopupSessionMixin(
  HTMLElement,
) as unknown as CustomElementConstructor;
customElements.define('flow-popup-session-probe', class extends Base {});

const ok = { ok: true };
const unauthorized = { ok: false, code: 401 };
const serverError = { ok: false, code: 500 };

const createEle = (refresh: jest.Mock) => {
  const ele: any = document.createElement('flow-popup-session-probe');
  // both come from mixins that only wire themselves up during a full widget
  // init, which this test deliberately does not run
  Object.defineProperty(ele, 'api', { value: { refresh } });
  Object.defineProperty(ele, 'actions', { value: { getMe: jest.fn() } });
  document.body.append(ele);
  return ele;
};

describe('flowPopupSessionMixin', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('re-reads the user only after the session is refreshed', async () => {
    const order: string[] = [];
    const refresh = jest.fn(async () => {
      order.push('refresh');
      return ok;
    });
    const ele = createEle(refresh);
    ele.actions.getMe.mockImplementation(() => order.push('getMe'));

    await ele.onFlowPopupClosed();

    // getMe on a stale token either fails or returns claims we already have
    expect(order).toEqual(['refresh', 'getMe']);
  });

  it('treats a 401 as the session genuinely ending, not as a failure', async () => {
    const ele = createEle(jest.fn(async () => unauthorized));
    const onLogout = jest.fn();
    ele.addEventListener('logout', onLogout);

    await ele.onFlowPopupClosed();

    // some flows deliberately end other sessions - a password change, say - so
    // "you are signed out" is the correct outcome, routed through the channel
    // the host app already handles
    expect(onLogout).toHaveBeenCalledTimes(1);
    expect(ele.actions.getMe).not.toHaveBeenCalled();
  });

  it('does not retry a 401, because retrying cannot help', async () => {
    const refresh = jest.fn(async () => unauthorized);
    const ele = createEle(refresh);

    await ele.onFlowPopupClosed();

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('retries once for a transient failure and carries on if it clears', async () => {
    const refresh = jest
      .fn()
      .mockResolvedValueOnce(serverError)
      .mockResolvedValueOnce(ok);
    const ele = createEle(refresh);

    await ele.onFlowPopupClosed();

    expect(refresh).toHaveBeenCalledTimes(2);
    expect(ele.actions.getMe).toHaveBeenCalledTimes(1);
  });

  it('surfaces an error rather than quietly showing stale data', async () => {
    const ele = createEle(jest.fn(async () => serverError));
    const onError = jest.fn();
    ele.addEventListener('error', onError);

    await ele.onFlowPopupClosed();

    expect(onError).toHaveBeenCalledTimes(1);
    expect(ele.actions.getMe).not.toHaveBeenCalled();
  });

  it('treats a thrown refresh the same as a failed one', async () => {
    const refresh = jest.fn().mockRejectedValue(new Error('offline'));
    const ele = createEle(refresh);
    const onError = jest.fn();
    ele.addEventListener('error', onError);

    await ele.onFlowPopupClosed();

    expect(refresh).toHaveBeenCalledTimes(2);
    expect(onError).toHaveBeenCalledTimes(1);
  });
});
