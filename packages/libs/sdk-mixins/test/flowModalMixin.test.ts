// flowModalMixin composes modalMixin, which composes a heavy chain (initLifecycle/initElement/descopeUi).
// Mock those down to identity mixins and let the bare stub provide the small
// surface createModal actually reads (rootElement, loadDescopeUiComponents).
jest.mock('../src/mixins/initLifecycleMixin', () => ({
  initLifecycleMixin: (superclass: any) => class extends superclass {},
}));
jest.mock('../src/mixins/initElementMixin', () => ({
  initElementMixin: (superclass: any) => class extends superclass {},
}));
jest.mock('../src/mixins/descopeUiMixin', () => ({
  descopeUiMixin: (superclass: any) => class extends superclass {},
}));

// eslint-disable-next-line import/first
import { flowModalMixin } from '../src';

// the ModalDriver runs afterClose via a MutationObserver on the `opened`
// attribute, which fires asynchronously - flush the task queue before asserting
const flushObserver = () => new Promise((resolve) => setTimeout(resolve, 0));

const createWidgetEl = () => {
  const rootElement = document.createElement('div');

  class Base {
    rootElement = rootElement;

    // eslint-disable-next-line class-methods-use-this
    loadDescopeUiComponents() {
      return Promise.resolve();
    }

    logger = {
      error() {},
      warn() {},
      info() {},
      debug() {},
    };
  }

  const MixinClass = flowModalMixin(Base as any);

  return new MixinClass() as any;
};

describe('flowModalMixin.createFlowModal', () => {
  const flowTemplate = (attrs = '') => {
    const template = document.createElement('template');
    template.innerHTML = `<descope-wc flow-id="sign-in" ${attrs}></descope-wc>`;

    return template;
  };

  it('holds the flow start call on a modal flow', () => {
    const el = createWidgetEl();
    const driver = el.createFlowModal();
    driver.setContent(flowTemplate());

    expect(
      driver.ele.querySelector('descope-wc').getAttribute('lazy-start'),
    ).toBe('true');
  });

  it('keeps an explicit lazy-start opt-out', () => {
    const el = createWidgetEl();
    const driver = el.createFlowModal();
    driver.setContent(flowTemplate('lazy-start="false"'));

    expect(
      driver.ele.querySelector('descope-wc').getAttribute('lazy-start'),
    ).toBe('false');
  });

  it('starts the held flow when the modal opens', async () => {
    const el = createWidgetEl();
    const driver = el.createFlowModal();
    driver.setContent(flowTemplate());

    const start = jest.fn();
    (driver.ele.querySelector('descope-wc') as any).start = start;
    await driver.open();

    expect(start).toHaveBeenCalledTimes(1);
  });

  it('does not throw when the modal has no flow in it', async () => {
    const el = createWidgetEl();
    const driver = el.createFlowModal();
    const template = document.createElement('template');
    template.innerHTML = '<div>no flow here</div>';
    driver.setContent(template);

    await expect(driver.open()).resolves.not.toThrow();
  });
});
