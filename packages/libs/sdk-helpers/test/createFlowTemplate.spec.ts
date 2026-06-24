import { createFlowTemplate } from '../src';

// Read the descope-wc's attributes into a plain object so assertions use plain
// jest matchers (these packages don't set up @testing-library/jest-dom) and
// getAttribute never sits directly inside expect().
const attrsOf = (template: HTMLTemplateElement) => {
  const el = template.content.querySelector('descope-wc');
  return Object.fromEntries(
    el.getAttributeNames().map((name) => [name, el.getAttribute(name)]),
  );
};

describe('createFlowTemplate', () => {
  it('renders a <descope-wc> element', () => {
    const el = createFlowTemplate({
      projectId: 'p1',
      flowId: 'sign-in',
    }).content.querySelector('descope-wc');

    expect(el?.tagName.toLowerCase()).toBe('descope-wc');
  });

  it('maps config keys to kebab-case attributes', () => {
    const attrs = attrsOf(
      createFlowTemplate({
        projectId: 'p1',
        flowId: 'sign-in',
        baseUrl: 'https://api',
        baseStaticUrl: 'https://static',
        baseCdnUrl: 'https://cdn',
        refreshCookieName: 'DSR_x',
        theme: 'dark',
        'style-id': 'style-1',
        locale: 'en-US',
      }),
    );

    expect(attrs).toMatchObject({
      'project-id': 'p1',
      'flow-id': 'sign-in',
      'base-url': 'https://api',
      'base-static-url': 'https://static',
      'base-cdn-url': 'https://cdn',
      'refresh-cookie-name': 'DSR_x',
      theme: 'dark',
      'style-id': 'style-1',
      locale: 'en-US',
    });
  });

  it('JSON-stringifies object client/form flow inputs', () => {
    const attrs = attrsOf(
      createFlowTemplate({
        projectId: 'p1',
        flowId: 'f',
        client: { userId: 'u1', tenantId: 't1' },
        form: { cookieName: 'DSR_x' },
      }),
    );

    expect(attrs.client).toBe('{"userId":"u1","tenantId":"t1"}');
    expect(attrs.form).toBe('{"cookieName":"DSR_x"}');
  });

  it('passes string client/form inputs through unchanged', () => {
    const attrs = attrsOf(
      createFlowTemplate({
        projectId: 'p1',
        flowId: 'f',
        client: '{"userId":"u1"}',
        form: '{"a":"b"}',
      }),
    );

    expect(attrs.client).toBe('{"userId":"u1"}');
    expect(attrs.form).toBe('{"a":"b"}');
  });

  it('serializes nested array values inside inputs', () => {
    const attrs = attrsOf(
      createFlowTemplate({
        projectId: 'p1',
        flowId: 'f',
        client: { userIds: ['a', 'b'] },
      }),
    );

    expect(attrs.client).toBe('{"userIds":["a","b"]}');
  });

  it('forwards widget-specific context (tenant, outboundAppId)', () => {
    const attrs = attrsOf(
      createFlowTemplate({
        projectId: 'p1',
        flowId: 'f',
        tenant: 't1',
        outboundAppId: 'app1',
      }),
    );

    expect(attrs.tenant).toBe('t1');
    expect(attrs['outbound-app-id']).toBe('app1');
  });

  it('sets an empty string for undefined values', () => {
    const attrs = attrsOf(
      createFlowTemplate({ projectId: 'p1', flowId: 'f', baseUrl: undefined }),
    );

    expect(attrs['base-url']).toBe('');
  });

  it('renders a bare <descope-wc> with no attributes for an empty config', () => {
    expect(attrsOf(createFlowTemplate())).toEqual({});
  });
});
