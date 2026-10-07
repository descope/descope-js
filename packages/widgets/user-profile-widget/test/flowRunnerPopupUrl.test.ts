import { buildFlowPopupUrl } from '../src/lib/widget/mixins/flowRunnerMixin';

const POPUP_URL = 'https://auth.example.com/popup-flow.html';

// stands in for the <descope-wc> inside the flow template
const flowEle = (attrs: Record<string, string>) => {
  const ele = document.createElement('descope-wc');
  Object.entries(attrs).forEach(([k, v]) => ele.setAttribute(k, v));
  return ele;
};

const paramsOf = (ele: Element | null, onParseError?: any) =>
  new URL(buildFlowPopupUrl(POPUP_URL, ele, onParseError)).searchParams;

describe('buildFlowPopupUrl', () => {
  it('carries the flow and project so the page knows what to run', () => {
    const params = paramsOf(
      flowEle({ 'flow-id': 'add-passkey', 'project-id': 'P2Test' }),
    );

    expect(params.get('flow')).toBe('add-passkey');
    expect(params.get('project')).toBe('P2Test');
  });

  it('keeps the configured path rather than replacing it', () => {
    const url = new URL(
      buildFlowPopupUrl(POPUP_URL, flowEle({ 'flow-id': 'f' })),
    );

    expect(url.origin).toBe('https://auth.example.com');
    expect(url.pathname).toBe('/popup-flow.html');
  });

  it('forwards presentation attributes the page can honour', () => {
    const params = paramsOf(
      flowEle({
        'flow-id': 'f',
        theme: 'dark',
        locale: 'es',
        tenant: 't1',
        'style-id': 's1',
      }),
    );

    expect(params.get('theme')).toBe('dark');
    expect(params.get('locale')).toBe('es');
    expect(params.get('tenant')).toBe('t1');
    expect(params.get('style')).toBe('s1');
  });

  it('expands form inputs, which is how a specific passkey is removed', () => {
    const params = paramsOf(
      flowEle({
        'flow-id': 'remove',
        form: JSON.stringify({ externalId: 'user-1', credentialId: 'cred-9' }),
      }),
    );

    expect(params.get('form.externalId')).toBe('user-1');
    expect(params.get('form.credentialId')).toBe('cred-9');
  });

  it('expands client inputs the same way', () => {
    const params = paramsOf(
      flowEle({ 'flow-id': 'f', client: JSON.stringify({ userId: 'u1' }) }),
    );

    expect(params.get('client.userId')).toBe('u1');
  });

  it('does not hand the popup an api base url or cookie name', () => {
    // an opener must not get to say where the page sends credentials - it
    // resolves those from its own environment
    const params = paramsOf(
      flowEle({
        'flow-id': 'f',
        'base-url': 'https://api.example.com',
        'base-static-url': 'https://static.example.com',
        'refresh-cookie-name': 'DSR_custom',
      }),
    );

    expect(params.get('base-url')).toBeNull();
    expect(params.get('base-static-url')).toBeNull();
    expect(params.get('refresh-cookie-name')).toBeNull();
  });

  it('skips attributes that are not set rather than sending empties', () => {
    const params = paramsOf(flowEle({ 'flow-id': 'f' }));

    expect(params.get('theme')).toBeNull();
    expect(params.get('locale')).toBeNull();
    expect([...params.keys()]).toEqual(['flow']);
  });

  it('reports malformed inputs instead of throwing mid-open', () => {
    const onParseError = jest.fn();

    const params = paramsOf(
      flowEle({ 'flow-id': 'f', form: 'not-json' }),
      onParseError,
    );

    expect(onParseError).toHaveBeenCalledWith('form', 'not-json');
    // the flow still opens, just without the unusable inputs
    expect(params.get('flow')).toBe('f');
  });

  it('tolerates a missing flow element', () => {
    expect(() => buildFlowPopupUrl(POPUP_URL, null)).not.toThrow();
  });
});
