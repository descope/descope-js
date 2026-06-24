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

const wc = (template: any) => template.content.querySelector('descope-wc');

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
      const el2 = wc(el.createFlowTemplate({ flowId: 'sign-in' }));

      expect(el2.getAttribute('project-id')).toBe('p1');
      expect(el2.getAttribute('flow-id')).toBe('sign-in');
      expect(el2.getAttribute('base-url')).toBe('https://api');
      expect(el2.getAttribute('base-static-url')).toBe('https://static');
      expect(el2.getAttribute('base-cdn-url')).toBe('https://cdn');
      expect(el2.getAttribute('refresh-cookie-name')).toBe('DSR_x');
      expect(el2.getAttribute('theme')).toBe('dark');
      expect(el2.getAttribute('style-id')).toBe('s1');
      expect(el2.getAttribute('locale')).toBe('en-US');
    });

    it('forwards the caller-supplied client/form inputs into the flow', () => {
      const el = createFlowInputEl({
        'project-id': 'p1',
        client: '{"tenantId":"t1"}',
        form: '{"cookieName":"DSR_x"}',
      });
      const el2 = wc(el.createFlowTemplate({ flowId: 'f' }));

      expect(JSON.parse(el2.getAttribute('client'))).toEqual({
        tenantId: 't1',
      });
      expect(el2.getAttribute('form')).toBe('{"cookieName":"DSR_x"}');
    });

    it('merges a per-flow client over the caller-supplied client (per-flow wins)', () => {
      const el = createFlowInputEl({
        'project-id': 'p1',
        client: '{"tenantId":"t1","userId":"caller"}',
      });
      const el2 = wc(
        el.createFlowTemplate({ flowId: 'f', client: { userId: 'flow' } }),
      );

      expect(JSON.parse(el2.getAttribute('client'))).toEqual({
        tenantId: 't1',
        userId: 'flow',
      });
    });

    it('merges a per-flow form over the caller-supplied form (per-flow wins)', () => {
      const el = createFlowInputEl({
        'project-id': 'p1',
        form: '{"cookieName":"DSR_x","deviceId":"old"}',
      });
      const el2 = wc(
        el.createFlowTemplate({ flowId: 'f', form: { deviceId: 'new' } }),
      );

      expect(JSON.parse(el2.getAttribute('form'))).toEqual({
        cookieName: 'DSR_x',
        deviceId: 'new',
      });
    });

    it('uses the per-flow form when no caller form is set', () => {
      const el = createFlowInputEl({ 'project-id': 'p1' });
      const el2 = wc(
        el.createFlowTemplate({ flowId: 'f', form: { deviceId: 'd1' } }),
      );

      expect(JSON.parse(el2.getAttribute('form'))).toEqual({ deviceId: 'd1' });
    });

    it('forwards widget-specific context (tenant, outboundAppId)', () => {
      const el = createFlowInputEl({ 'project-id': 'p1' });
      const el2 = wc(
        el.createFlowTemplate({
          flowId: 'f',
          tenant: 't1',
          outboundAppId: 'app1',
        }),
      );

      expect(el2.getAttribute('tenant')).toBe('t1');
      expect(el2.getAttribute('outbound-app-id')).toBe('app1');
    });
  });
});
