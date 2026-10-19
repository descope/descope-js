import {
  POPUP_URL_MAX_CHARS,
  buildFlowPopupUrl,
  resolveFlowTarget,
} from '../src/lib/widget/mixins/flowRunnerMixin';

// what the backend publishes as hostedPageBaseUrl for a project with its own
// custom domain; auth-hosting serves the flow at <base>/<projectId>
const HOSTED_BASE = 'https://auth.example.com/login';

// stands in for the <descope-wc> inside the flow template
const flowEle = (attrs: Record<string, string>) => {
  const ele = document.createElement('descope-wc');
  Object.entries(attrs).forEach(([k, v]) => ele.setAttribute(k, v));
  return ele;
};

const paramsOf = (ele: Element | null, onParseError?: any, appId?: string) =>
  new URL(buildFlowPopupUrl(HOSTED_BASE, ele, onParseError, undefined, appId))
    .searchParams;

describe('buildFlowPopupUrl', () => {
  // The app the widget is embedded in. The page in the popup hands it to the
  // backend, which merges that app's trusted domains with the project's before
  // the flow may report anything back.
  it('carries the app when the host named one', () => {
    const params = paramsOf(
      flowEle({ 'flow-id': 'f', 'project-id': 'P2Test' }),
      undefined,
      'SA1',
    );

    expect(params.get('appId')).toBe('SA1');
  });

  it('leaves it out when the host named none, so nothing changes by upgrading', () => {
    const params = paramsOf(
      flowEle({ 'flow-id': 'f', 'project-id': 'P2Test' }),
    );

    expect(params.has('appId')).toBe(false);
  });

  it('carries the flow so the page knows what to run', () => {
    const params = paramsOf(
      flowEle({ 'flow-id': 'add-passkey', 'project-id': 'P2Test' }),
    );

    expect(params.get('flow')).toBe('add-passkey');
  });

  it('puts the project in the path, which is where auth-hosting reads it', () => {
    const url = new URL(
      buildFlowPopupUrl(
        HOSTED_BASE,
        flowEle({ 'flow-id': 'f', 'project-id': 'P2Test' }),
      ),
    );

    expect(url.origin).toBe('https://auth.example.com');
    expect(url.pathname).toBe('/login/P2Test');
    // not duplicated as a query param
    expect(url.searchParams.get('project')).toBeNull();
  });

  it('tolerates a base url with a trailing slash', () => {
    const url = new URL(
      buildFlowPopupUrl(
        'https://auth.example.com/login/',
        flowEle({ 'flow-id': 'f', 'project-id': 'P2Test' }),
      ),
    );

    expect(url.pathname).toBe('/login/P2Test');
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
    expect(() => buildFlowPopupUrl(HOSTED_BASE, null)).not.toThrow();
  });
});

describe('url length', () => {
  const build = (attrs: Record<string, string>, onTooLong?: any) =>
    buildFlowPopupUrl(HOSTED_BASE, flowEle(attrs), undefined, onTooLong);

  it('says nothing about the flows we actually send', () => {
    const onTooLong = jest.fn();
    // the biggest real one: removing a specific passkey
    const url = build(
      {
        'flow-id': 'remove-passkey',
        'project-id': 'P3HmRBOz7fQNZ6Fr4KtdxGeH1Quu',
        theme: 'dark',
        form: JSON.stringify({
          externalId: 'U3KdUAoMYI8ZVCUGjBTYmHHh7OND',
          credentialId: 'A'.repeat(88),
        }),
      },
      onTooLong,
    );

    expect(onTooLong).not.toHaveBeenCalled();
    expect(url.length).toBeLessThan(POPUP_URL_MAX_CHARS);
  });

  it('reports a url that would be refused before the flow could start', () => {
    const onTooLong = jest.fn();
    build(
      {
        'flow-id': 'f',
        'project-id': 'P2Test',
        // what passing data instead of an identifier looks like
        form: JSON.stringify({ profile: 'x'.repeat(POPUP_URL_MAX_CHARS) }),
      },
      onTooLong,
    );

    expect(onTooLong).toHaveBeenCalledTimes(1);
    expect(onTooLong.mock.calls[0][0]).toBeGreaterThan(POPUP_URL_MAX_CHARS);
  });

  it('still returns the url, because truncating would break the flow silently', () => {
    const url = build({
      'flow-id': 'f',
      'project-id': 'P2Test',
      form: JSON.stringify({ profile: 'x'.repeat(POPUP_URL_MAX_CHARS) }),
    });

    expect(new URL(url).searchParams.get('form.profile')).toHaveLength(
      POPUP_URL_MAX_CHARS,
    );
  });
});

describe('resolveFlowTarget', () => {
  it('opens a popup when the project asked for one and has somewhere to open it', () => {
    expect(resolveFlowTarget('popup', HOSTED_BASE)).toBe('popup');
  });

  it('keeps the modal for a project that has not opted in', () => {
    expect(resolveFlowTarget(undefined, HOSTED_BASE)).toBe('modal');
    expect(resolveFlowTarget('modal', HOSTED_BASE)).toBe('modal');
  });

  it('falls back to the modal when the project has no custom domain', () => {
    // the backend omits hostedPageBaseUrl rather than publishing the shared
    // Descope host, so "popup" with no url means popup mode is unavailable -
    // a modal is better than a button that does nothing
    const onUnavailable = jest.fn();

    expect(resolveFlowTarget('popup', undefined, onUnavailable)).toBe('modal');
    expect(onUnavailable).toHaveBeenCalledTimes(1);
  });

  it('stays quiet when the modal was the choice anyway', () => {
    const onUnavailable = jest.fn();

    resolveFlowTarget(undefined, undefined, onUnavailable);

    expect(onUnavailable).not.toHaveBeenCalled();
  });
});
