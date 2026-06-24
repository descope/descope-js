// themeMixin pulls in a heavy chain (initElement/descopeUi/observeAttributes...)
// that can't be constructed over a bare stub - mock it down to the two getters
// flowInputMixin actually reads.
jest.mock('../src/mixins/themeMixin', () => ({
  themeMixin: (superclass: any) =>
    class extends superclass {
      get theme() {
        return this.getAttribute('theme') || 'light';
      }

      get styleId() {
        return this.getAttribute('style-id') || 'default-style';
      }
    },
}));

// eslint-disable-next-line import/first
import { flowInputMixin } from '../src';

const createFlowInputEl = (attrs: Record<string, string | null> = {}) => {
  const MixinClass = flowInputMixin(
    class {
      getAttribute(attr: string) {
        return attr in attrs ? attrs[attr] : null;
      }
    } as any,
  );
  return new MixinClass() as any;
};

// Read the produced descope-wc's attributes into a plain object so assertions
// use plain jest matchers (these packages don't set up jest-dom) and
// getAttribute never sits directly inside expect().
const attrsOf = (template: any) => {
  const el = template.content.querySelector('descope-wc');
  return Object.fromEntries(
    el.getAttributeNames().map((name: string) => [name, el.getAttribute(name)]),
  );
};

describe('flowInputMixin', () => {
  describe('clientInput', () => {
    it('parses the client attribute JSON', () => {
      expect(
        createFlowInputEl({ client: '{"tenantId":"t1"}' }).clientInput,
      ).toEqual({ tenantId: 't1' });
    });

    it('returns {} when the client attribute is missing', () => {
      expect(createFlowInputEl().clientInput).toEqual({});
    });

    it('returns {} when the client attribute is invalid JSON', () => {
      expect(createFlowInputEl({ client: 'not-json' }).clientInput).toEqual({});
    });
  });

  describe('formInput', () => {
    it('returns the raw form attribute string', () => {
      expect(createFlowInputEl({ form: '{"a":"b"}' }).formInput).toBe(
        '{"a":"b"}',
      );
    });

    it('returns undefined when the form attribute is unset', () => {
      expect(createFlowInputEl().formInput).toBeUndefined();
    });
  });

  describe('createFlowTemplate', () => {
    it('injects the widget shared config from attributes', () => {
      const el = createFlowInputEl({
        'project-id': 'p1',
        'base-url': 'https://api',
        'base-static-url': 'https://static',
        'base-cdn-url': 'https://cdn',
        'refresh-cookie-name': 'DSR_x',
        theme: 'dark',
        'style-id': 's1',
        locale: 'en-US',
      });

      expect(
        attrsOf(el.createFlowTemplate({ flowId: 'sign-in' })),
      ).toMatchObject({
        'project-id': 'p1',
        'flow-id': 'sign-in',
        'base-url': 'https://api',
        'base-static-url': 'https://static',
        'base-cdn-url': 'https://cdn',
        'refresh-cookie-name': 'DSR_x',
        theme: 'dark',
        'style-id': 's1',
        locale: 'en-US',
      });
    });

    it('forwards the caller-supplied client/form inputs into the flow', () => {
      const el = createFlowInputEl({
        'project-id': 'p1',
        client: '{"tenantId":"t1"}',
        form: '{"cookieName":"DSR_x"}',
      });
      const attrs = attrsOf(el.createFlowTemplate({ flowId: 'f' }));

      expect(JSON.parse(attrs.client)).toEqual({ tenantId: 't1' });
      expect(attrs.form).toBe('{"cookieName":"DSR_x"}');
    });

    it('merges a per-flow client over the caller-supplied client (per-flow wins)', () => {
      const el = createFlowInputEl({
        'project-id': 'p1',
        client: '{"tenantId":"t1","userId":"caller"}',
      });
      const attrs = attrsOf(
        el.createFlowTemplate({ flowId: 'f', client: { userId: 'flow' } }),
      );

      expect(JSON.parse(attrs.client)).toEqual({
        tenantId: 't1',
        userId: 'flow',
      });
    });

    it('merges a per-flow form over the caller-supplied form (per-flow wins)', () => {
      const el = createFlowInputEl({
        'project-id': 'p1',
        form: '{"cookieName":"DSR_x","deviceId":"old"}',
      });
      const attrs = attrsOf(
        el.createFlowTemplate({ flowId: 'f', form: { deviceId: 'new' } }),
      );

      expect(JSON.parse(attrs.form)).toEqual({
        cookieName: 'DSR_x',
        deviceId: 'new',
      });
    });

    it('uses the per-flow form when no caller form is set', () => {
      const el = createFlowInputEl({ 'project-id': 'p1' });
      const attrs = attrsOf(
        el.createFlowTemplate({ flowId: 'f', form: { deviceId: 'd1' } }),
      );

      expect(JSON.parse(attrs.form)).toEqual({ deviceId: 'd1' });
    });

    it('forwards widget-specific context (tenant, outboundAppId)', () => {
      const el = createFlowInputEl({ 'project-id': 'p1' });
      const attrs = attrsOf(
        el.createFlowTemplate({
          flowId: 'f',
          tenant: 't1',
          outboundAppId: 'app1',
        }),
      );

      expect(attrs.tenant).toBe('t1');
      expect(attrs['outbound-app-id']).toBe('app1');
    });
  });
});
