import { shallowMount, mount } from '@vue/test-utils';
import Descope from '../src/Descope.vue';
import { default as DescopeWC } from '@descope/web-component';

jest.mock('../src/hooks', () => ({
  useOptions: () => ({ projectId: 'project1', baseUrl: 'baseUrl' }),
  useDescope: () => ({ httpClient: { hooks: { afterRequest: jest.fn() } } }),
  useUser: () => ({}),
  useSession: () => ({}),
}));

globalThis.Response = <any>class {};

describe('Descope.vue', () => {
  it('renders the WC', () => {
    const wrapper = shallowMount(Descope, {
      props: { flowId: 'flow1' },
    });
    expect(wrapper.find('descope-wc').exists()).toBe(true);
  });

  it('renders a DescopeWc component with the correct props', () => {
    const errorTransformer = (error: { text: string; type: string }) => {
      return error.text || error.type;
    };
    const onScreenUpdate = () => false;
    const wrapper = mount(Descope, {
      props: {
        flowId: 'test-flow-id',
        tenant: 'test-tenant',
        theme: 'test-theme',
        locale: 'test-locale',
        debug: true,
        telemetryKey: 'test-telemetry-key',
        redirectUrl: 'test-redirect-url',
        autoFocus: true,
        errorTransformer,
        onScreenUpdate,
        form: { test: 'a' },
        client: { test: 'b' },
        styleId: 'test-style-id',
      },
    });

    const descopeWc = wrapper.find('descope-wc');
    expect(descopeWc.exists()).toBe(true);
    expect(descopeWc.attributes('project-id')).toBe('project1');
    expect(descopeWc.attributes('base-url')).toBe('baseUrl');
    expect(descopeWc.attributes('flow-id')).toBe('test-flow-id');
    expect(descopeWc.attributes('theme')).toBe('test-theme');
    expect(descopeWc.attributes('locale')).toBe('test-locale');
    expect(descopeWc.attributes('tenant')).toBe('test-tenant');
    expect(descopeWc.attributes('debug')).toBe('true');
    expect(descopeWc.attributes('telemetrykey')).toBe('test-telemetry-key');
    expect(descopeWc.attributes('redirect-url')).toBe('test-redirect-url');
    expect(descopeWc.attributes('auto-focus')).toBe('true');
    expect(wrapper.vm.errorTransformer).toBe(errorTransformer);
    expect(wrapper.vm.onScreenUpdate).toBe(onScreenUpdate);
    expect(descopeWc.attributes('form')).toBe('{"test":"a"}');
    expect(wrapper.vm.client).toStrictEqual({ test: 'b' });
    expect(descopeWc.attributes('style-id')).toBe('test-style-id');
  });

  it('renders a DescopeWc component with empty props', () => {
    const wrapper = mount(Descope, {
      props: {
        flowId: 'test-flow-id',
        form: {},
        client: {},
      },
    });

    const descopeWc = wrapper.find('descope-wc');
    expect(descopeWc.attributes('form')).toEqual('{}');
    expect(wrapper.vm.client).toEqual({});
  });

  it('init sdk config', async () => {
    const wrapper = mount(Descope);
    const descopeWc = wrapper.find('descope-wc');
    expect(descopeWc).toBeTruthy();

    expect(DescopeWC.sdkConfigOverrides).toEqual({
      baseHeaders: {
        'x-descope-sdk-name': 'vue',
        'x-descope-sdk-version': '123',
      },
      persistTokens: false,
      hooks: {
        beforeRequest: expect.any(Function),
      },
    });
  });

  it('emits a success event when the DescopeWc component emits a success event', async () => {
    const wrapper = mount(Descope);
    const descopeWc = wrapper.find('descope-wc');

    await descopeWc.trigger('success', { detail: 'test-success-payload' });

    expect(wrapper.emitted('success')).toBeTruthy();
    expect(wrapper.emitted('success')?.[0]?.[0]).toMatchObject({
      detail: 'test-success-payload',
    });
  });

  it('emits an error event when the DescopeWc component emits an error event', async () => {
    const wrapper = mount(Descope);
    const descopeWc = wrapper.find('descope-wc');

    await descopeWc.trigger('error', { detail: 'test-error-payload' });

    expect(wrapper.emitted('error')).toBeTruthy();
    expect(wrapper.emitted('error')?.[0]?.[0]).toMatchObject({
      detail: 'test-error-payload',
    });
  });

  it('emits an ready event when the DescopeWc component emits an ready event', async () => {
    const wrapper = mount(Descope);
    const descopeWc = wrapper.find('descope-wc');

    await descopeWc.trigger('ready', {});

    expect(wrapper.emitted('ready')).toBeTruthy();
  });

  describe('customStorage', () => {
    const mockCustomStorage = {
      getItem: jest.fn((key: string) => `mocked_${key}`),
      setItem: jest.fn(),
      removeItem: jest.fn(),
    };

    it('should pass customStorage prop to web-component', () => {
      const wrapper = mount(Descope, {
        props: {
          flowId: 'test-flow-id',
          customStorage: mockCustomStorage,
        },
      });

      const descopeWc = wrapper.find('descope-wc');
      expect(descopeWc.exists()).toBe(true);
    });

    it('should handle customStorage with async methods', () => {
      const asyncCustomStorage = {
        getItem: jest.fn(async (key: string) =>
          Promise.resolve(`async_${key}`),
        ),
        setItem: jest.fn(async () => Promise.resolve()),
        removeItem: jest.fn(async () => Promise.resolve()),
      };

      const wrapper = mount(Descope, {
        props: {
          flowId: 'test-flow-id',
          customStorage: asyncCustomStorage,
        },
      });

      const descopeWc = wrapper.find('descope-wc');
      expect(descopeWc.exists()).toBe(true);
    });

    it('should work without customStorage prop', () => {
      const wrapper = mount(Descope, {
        props: { flowId: 'test-flow-id' },
      });

      const descopeWc = wrapper.find('descope-wc');
      expect(descopeWc.exists()).toBe(true);
    });

    it('should update customStorage when prop changes', async () => {
      const wrapper = mount(Descope, {
        props: {
          flowId: 'test-flow-id',
          customStorage: mockCustomStorage,
        },
      });

      const newCustomStorage = {
        getItem: jest.fn((key: string) => `new_${key}`),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      };

      await wrapper.setProps({ customStorage: newCustomStorage });

      const descopeWc = wrapper.find('descope-wc');
      expect(descopeWc.exists()).toBe(true);
    });
  });
});
