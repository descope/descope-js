// Importing the module registers the `descope-debugger` custom element.
import '../src/mixins/debuggerMixin/debugger-wc';

// jsdom has no CSSStyleSheet.replaceSync, which injectStyleMixin calls from the
// element constructor. Same stub the web-component tests use. Safe to set after
// the import: the constructor only runs on createElement, below.
global.CSSStyleSheet.prototype.replaceSync = jest.fn();

// A payload that becomes a live element if the message text is ever parsed as
// markup instead of escaped.
const XSS_PAYLOAD = '<img src=x onerror=alert(1)>';

type DebuggerEle = HTMLElement & {
  updateData: (data: { title: string; description?: string }) => void;
};

const mountDebugger = () => {
  const ele = document.createElement('descope-debugger') as DebuggerEle;
  document.body.appendChild(ele);
  return ele;
};

// State notifies its subscribers on a setTimeout(0), so the render happens one
// macrotask after updateData.
const flush = () =>
  new Promise((resolve) => {
    setTimeout(resolve, 0);
  });

const textOf = (ele: DebuggerEle, selector: string) =>
  ele.shadowRoot!.querySelector(selector)?.textContent;

describe('descope-debugger message rendering', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should render a message title as text, never as markup', async () => {
    const ele = mountDebugger();

    ele.updateData({ title: XSS_PAYLOAD, description: 'a description' });

    await flush();

    expect(ele.shadowRoot!.querySelector('img')).toBeNull();
    expect(ele.shadowRoot!.querySelector('script')).toBeNull();
    expect(textOf(ele, '.msg_title')).toContain(XSS_PAYLOAD);
  });

  it('should render a message description as text, never as markup', async () => {
    const ele = mountDebugger();

    ele.updateData({ title: 'a title', description: XSS_PAYLOAD });

    await flush();

    expect(ele.shadowRoot!.querySelector('img')).toBeNull();
    expect(ele.shadowRoot!.querySelector('script')).toBeNull();
    expect(textOf(ele, '.msg_desc')).toContain(XSS_PAYLOAD);
  });

  it('should leave ordinary message text readable', async () => {
    const ele = mountDebugger();

    ele.updateData({ title: "Can't reach the server", description: 'retry' });

    await flush();

    expect(textOf(ele, '.msg_title')).toContain("Can't reach the server");
    expect(textOf(ele, '.msg_desc')).toContain('retry');
  });

  it('should render an empty description rather than the word undefined', async () => {
    const ele = mountDebugger();

    ele.updateData({ title: 'a title' });

    await flush();

    expect(textOf(ele, '.msg_desc')).not.toContain('undefined');
  });
});
