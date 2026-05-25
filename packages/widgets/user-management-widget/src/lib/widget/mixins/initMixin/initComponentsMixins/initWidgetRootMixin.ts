import {
  compose,
  createSingletonMixin,
  createTemplate,
} from '@descope/sdk-helpers';
import {
  descopeUiMixin,
  initElementMixin,
  initLifecycleMixin,
  loggerMixin,
  widgetConfigMixin,
} from '@descope/sdk-mixins';
import { fetchWidgetPagesMixin } from '../../fetchWidgetPagesMixin';
import { stateManagementMixin } from '../../stateManagementMixin';

export const initWidgetRootMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class InitWidgetRootMixinClass extends compose(
      loggerMixin,
      initLifecycleMixin,
      descopeUiMixin,
      initElementMixin,
      fetchWidgetPagesMixin,
      stateManagementMixin,
      widgetConfigMixin,
    )(superclass) {
      async #initWidgetRoot() {
        const template = createTemplate(
          // await import('../../../../../../test/mocks/rootMock').then(module => module.default)
          await this.fetchWidgetPage('root.html'),
        );
        await this.loadDescopeUiComponents(template);
        this.contentRootElement.append(template.content.cloneNode(true));
      }

      // eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-empty-function
      async onWidgetRootReady() {}

      async init() {
        await super.init?.();

        this.injectStyle('.hidden { display: none; }');

        const widgetConfig = await this.getWidgetConfig();

        const initPromises = [
          this.#initWidgetRoot(),
          this.actions.searchUsers(),
          this.actions.getTenantRoles(),
          this.actions.getCustomAttributes(),
        ];
        if (widgetConfig?.allowSubTenants) {
          initPromises.push(this.actions.getSubTenantRoles());
        }
        await Promise.all(initPromises);

        await this.onWidgetRootReady();
        this.dispatchEvent(new CustomEvent('ready'));
      }
    },
);
