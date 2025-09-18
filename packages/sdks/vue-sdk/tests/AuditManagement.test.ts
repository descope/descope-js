import { shallowMount, mount } from '@vue/test-utils';
import AuditManagement from '../src/AuditManagement.vue';

jest.mock('../src/hooks', () => ({
  useOptions: () => ({ projectId: 'project1', baseUrl: 'baseUrl' }),
  useDescope: () => ({ httpClient: { hooks: { afterRequest: jest.fn() } } }),
  useUser: () => ({}),
  useSession: () => ({}),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
globalThis.Response = <any>class {};

describe('AuditManagement.vue', () => {
  it('renders the widget', () => {
    const wrapper = shallowMount(AuditManagement, {
      props: { tenant: 'flow1', widgetId: 'widget1' },
    });
    expect(wrapper.find('descope-audit-management-widget').exists()).toBe(true);
  });

  it('renders a widget with the correct props', () => {
    const wrapper = mount(AuditManagement, {
      props: {
        tenant: 'test-tenant',
        widgetId: 'widget1',
        theme: 'test-theme',
        locale: 'test-locale',
        debug: true,
      },
    });

    const descopeWc = wrapper.find('descope-audit-management-widget');
    expect(descopeWc.exists()).toBe(true);
    expect(descopeWc.attributes('project-id')).toBe('project1');
    expect(descopeWc.attributes('base-url')).toBe('baseUrl');
    expect(descopeWc.attributes('theme')).toBe('test-theme');
    expect(descopeWc.attributes('tenant')).toBe('test-tenant');
    expect(descopeWc.attributes('widget-id')).toBe('widget1');
    expect(descopeWc.attributes('debug')).toBe('true');
  });

  it('emits ready event when web component dispatches ready', () => {
    const wrapper = mount(AuditManagement, {
      props: { tenant: 'flow1', widgetId: 'widget1' },
    });

    const descopeWc = wrapper.find('descope-audit-management-widget');
    expect(descopeWc.exists()).toBe(true);

    // Dispatch ready event on the web component
    descopeWc.element.dispatchEvent(new CustomEvent('ready'));

    // Check that the component emits the ready event
    expect(wrapper.emitted('ready')).toBeTruthy();
    expect(wrapper.emitted('ready')).toHaveLength(1);
  });
});
