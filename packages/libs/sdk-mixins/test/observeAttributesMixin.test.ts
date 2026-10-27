import { attributesObserver } from '../src/mixins/observeAttributesMixin/helpers';

// MutationObserver callbacks run as microtasks
const flush = () => new Promise((resolve) => setTimeout(resolve));

describe('attributesObserver', () => {
  it('calls back on init and on value changes, not on same-value writes', async () => {
    const ele = document.createElement('div');
    ele.setAttribute('foo', 'a');
    const callback = jest.fn();

    attributesObserver(ele, callback);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenLastCalledWith('foo');

    ele.setAttribute('foo', 'a');
    await flush();
    expect(callback).toHaveBeenCalledTimes(1);

    ele.setAttribute('foo', 'b');
    await flush();
    expect(callback).toHaveBeenCalledTimes(2);

    ele.removeAttribute('foo');
    await flush();
    expect(callback).toHaveBeenCalledTimes(3);

    ele.setAttribute('foo', '');
    await flush();
    expect(callback).toHaveBeenCalledTimes(4);
  });
});
