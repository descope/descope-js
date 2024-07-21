import { shallowMount, mount } from '@vue/test-utils';
import RoleManagement from '../src/RoleManagement.vue';

jest.mock('../src/hooks', () => ({
  useOptions: () => ({ projectId: 'project1', baseUrl: 'baseUrl' }),
  useDescope: () => ({ httpClient: { hooks: { afterRequest: jest.fn() } } }),
  useUser: () => ({}),
  useSession: () => ({}),
}));

globalThis.Response = <any>class {};

describe('RoleManagement.vue', () => {
  it('renders the widget', () => {
    const wrapper = shallowMount(RoleManagement, {
      props: { tenant: 'flow1', widgetId: 'widget1' },
    });
    expect(wrapper.find('descope-role-management-widget').exists()).toBe(true);
  });

  it('renders a widget with the correct props', () => {
    const wrapper = mount(RoleManagement, {
      props: {
        tenant: 'test-tenant',
        widgetId: 'widget1',
        theme: 'test-theme',
        locale: 'test-locale',
        debug: true,
      },
    });

    const descopeWc = wrapper.find('descope-role-management-widget');
    expect(descopeWc.exists()).toBe(true);
    expect(descopeWc.attributes('project-id')).toBe('project1');
    expect(descopeWc.attributes('base-url')).toBe('baseUrl');
    expect(descopeWc.attributes('theme')).toBe('test-theme');
    expect(descopeWc.attributes('tenant')).toBe('test-tenant');
    expect(descopeWc.attributes('widget-id')).toBe('widget1');
    expect(descopeWc.attributes('debug')).toBe('true');
  });
});
