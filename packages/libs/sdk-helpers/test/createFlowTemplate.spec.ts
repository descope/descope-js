import { createFlowTemplate } from '../src';

const wc = (template: HTMLTemplateElement) =>
  template.content.querySelector('descope-wc');

describe('createFlowTemplate', () => {
  it('renders a <descope-wc> element', () => {
    const el = wc(createFlowTemplate({ projectId: 'p1', flowId: 'sign-in' }));
    expect(el).not.toBeNull();
    expect(el.tagName.toLowerCase()).toBe('descope-wc');
  });

  it('maps config keys to kebab-case attributes', () => {
    const el = wc(
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

    expect(el.getAttribute('project-id')).toBe('p1');
    expect(el.getAttribute('flow-id')).toBe('sign-in');
    expect(el.getAttribute('base-url')).toBe('https://api');
    expect(el.getAttribute('base-static-url')).toBe('https://static');
    expect(el.getAttribute('base-cdn-url')).toBe('https://cdn');
    expect(el.getAttribute('refresh-cookie-name')).toBe('DSR_x');
    expect(el.getAttribute('theme')).toBe('dark');
    expect(el.getAttribute('style-id')).toBe('style-1');
    expect(el.getAttribute('locale')).toBe('en-US');
  });

  it('JSON-stringifies object client/form flow inputs', () => {
    const el = wc(
      createFlowTemplate({
        projectId: 'p1',
        flowId: 'f',
        client: { userId: 'u1', tenantId: 't1' },
        form: { cookieName: 'DSR_x' },
      }),
    );

    expect(el.getAttribute('client')).toBe('{"userId":"u1","tenantId":"t1"}');
    expect(el.getAttribute('form')).toBe('{"cookieName":"DSR_x"}');
  });

  it('passes string client/form inputs through unchanged', () => {
    const el = wc(
      createFlowTemplate({
        projectId: 'p1',
        flowId: 'f',
        client: '{"userId":"u1"}',
        form: '{"a":"b"}',
      }),
    );

    expect(el.getAttribute('client')).toBe('{"userId":"u1"}');
    expect(el.getAttribute('form')).toBe('{"a":"b"}');
  });

  it('serializes nested array values inside inputs', () => {
    const el = wc(
      createFlowTemplate({
        projectId: 'p1',
        flowId: 'f',
        client: { userIds: ['a', 'b'] },
      }),
    );

    expect(el.getAttribute('client')).toBe('{"userIds":["a","b"]}');
  });

  it('forwards widget-specific context (tenant, outboundAppId)', () => {
    const el = wc(
      createFlowTemplate({
        projectId: 'p1',
        flowId: 'f',
        tenant: 't1',
        outboundAppId: 'app1',
      }),
    );

    expect(el.getAttribute('tenant')).toBe('t1');
    expect(el.getAttribute('outbound-app-id')).toBe('app1');
  });

  it('sets an empty string for undefined values', () => {
    const el = wc(
      createFlowTemplate({ projectId: 'p1', flowId: 'f', baseUrl: undefined }),
    );

    expect(el.getAttribute('base-url')).toBe('');
  });

  it('renders a bare <descope-wc> with no attributes for an empty config', () => {
    const el = wc(createFlowTemplate());

    expect(el).not.toBeNull();
    expect(el.attributes.length).toBe(0);
  });
});
