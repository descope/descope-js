import { flowRunnerMixin } from '../src/lib/widget/mixins/flowRunnerMixin';

// jsdom 20 ships CSSStyleSheet without replaceSync, and injectStyleMixin calls
// it while the element is being constructed. Nothing here is about styling.
(CSSStyleSheet.prototype as any).replaceSync ??= () => {};

const Base = flowRunnerMixin(
  HTMLElement,
) as unknown as CustomElementConstructor;
customElements.define('flow-runner-blocked-probe', class extends Base {});

const HOSTED_BASE = 'https://auth.example.com/login';

const flowTemplate = () => {
  const template = document.createElement('template');
  template.innerHTML =
    '<descope-wc flow-id="add-passkey" project-id="P2Test"></descope-wc>';
  return template;
};

// Everything stubbed here comes from a mixin that only wires itself up during a
// full widget init, which this test deliberately does not run.
const createEle = async () => {
  const ele: any = document.createElement('flow-runner-blocked-probe');
  Object.defineProperty(ele, 'getWidgetConfig', {
    value: async () => ({ flowTarget: 'popup' }),
  });
  Object.defineProperty(ele, 'getHostedPageBaseUrl', {
    value: async () => HOSTED_BASE,
  });
  Object.defineProperty(ele, 'createFlowTemplate', { value: flowTemplate });
  document.body.append(ele);
  await ele.onWidgetRootReady();
  return ele;
};

describe('a flow popup the browser refuses to open', () => {
  let open: jest.SpyInstance;

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    open?.mockRestore();
  });

  // Falling back to a modal would defeat the point: the passkey would bind to
  // the app's own domain, which is what popup mode exists to avoid. So the app
  // has to be told instead.
  it('tells the host app instead of leaving the button doing nothing', async () => {
    open = jest.spyOn(window, 'open').mockReturnValue(null);
    const ele = await createEle();
    const onError = jest.fn();
    ele.addEventListener('error', onError);

    ele.createFlowRunner({ dataId: 'd', flowId: 'add-passkey' }).open();

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0].detail).toEqual({
      message: 'flow-popup-blocked',
    });
  });

  it('says nothing when the popup actually opens', async () => {
    open = jest.spyOn(window, 'open').mockReturnValue({
      focus: jest.fn(),
      closed: false,
      location: { href: '' },
    } as any);
    const ele = await createEle();
    const onError = jest.fn();
    ele.addEventListener('error', onError);

    ele.createFlowRunner({ dataId: 'd', flowId: 'add-passkey' }).open();

    expect(onError).not.toHaveBeenCalled();
  });
});
