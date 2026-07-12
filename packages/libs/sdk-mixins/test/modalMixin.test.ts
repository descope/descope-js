// modalMixin composes a heavy chain (initLifecycle/initElement/descopeUi).
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
import { modalMixin } from '../src';

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

  const MixinClass = modalMixin(Base as any);

  return new MixinClass() as any;
};

describe('modalMixin.createModal', () => {
  it('creates a descope-modal and appends it to the root element', () => {
    const el = createWidgetEl();
    const driver = el.createModal();

    expect(driver.ele).not.toBeNull();
    expect(el.rootElement.querySelector('descope-modal')).toBe(driver.ele);
  });

  it('copies config attributes onto the modal element', () => {
    const el = createWidgetEl();
    const driver = el.createModal({
      'data-id': 'edit-email',
      'close-on-outside-click': 'true',
    });
    const attrs = {
      dataId: driver.ele.getAttribute('data-id'),
      closeOnOutsideClick: driver.ele.getAttribute('close-on-outside-click'),
    };

    expect(attrs).toEqual({
      dataId: 'edit-email',
      closeOnOutsideClick: 'true',
    });
  });

  it('runs afterClose when the modal becomes closed (opened removed)', async () => {
    const el = createWidgetEl();
    const driver = el.createModal();
    const afterClose = jest.fn();
    driver.afterClose = afterClose;

    driver.ele.setAttribute('opened', 'true');
    driver.ele.removeAttribute('opened');
    await flushObserver();

    expect(afterClose).toHaveBeenCalledTimes(1);
  });

  it('runs afterClose when close() is called', async () => {
    const el = createWidgetEl();
    const driver = el.createModal();
    driver.ele.setAttribute('opened', 'true');
    const afterClose = jest.fn();
    driver.afterClose = afterClose;

    driver.close();
    await flushObserver();

    expect(afterClose).toHaveBeenCalledTimes(1);
  });

  it('does not run afterClose when the modal opens', async () => {
    const el = createWidgetEl();
    const driver = el.createModal();
    const afterClose = jest.fn();
    driver.afterClose = afterClose;

    driver.ele.setAttribute('opened', 'true');
    await flushObserver();

    expect(afterClose).not.toHaveBeenCalled();
  });

  it('does not throw when the modal closes without an afterClose set', async () => {
    const el = createWidgetEl();
    const driver = el.createModal();

    driver.ele.setAttribute('opened', 'true');
    driver.ele.removeAttribute('opened');

    await expect(flushObserver()).resolves.not.toThrow();
  });
});
