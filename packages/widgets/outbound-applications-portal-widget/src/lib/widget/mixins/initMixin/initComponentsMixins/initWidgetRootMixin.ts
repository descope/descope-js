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
    )(superclass) {
      async #initWidgetRoot() {
        const template = createTemplate(
          // TODO: [outbound-applications-portal-widget] revert mocks
          await import('../../../../../../test/mocks/rootMock').then(
            (module) => module.default,
          ),
          // await this.fetchWidgetPage('root.html'),
        );
        await this.loadDescopeUiComponents(template);

        return template;
      }

      #renderTemplate(template: HTMLTemplateElement) {
        this.contentRootElement.append(template.content.cloneNode(true));
      }

      // eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-empty-function
      async onWidgetRootReady() {}

      async init() {
        await super.init?.();

        await this.actions.getMe();

        await Promise.all([
          this.actions.getOutboundApps(),
          this.actions.getConnectedOutboundApps({
            userId: this.state.me.data.userId,
          }),
        ]);

        const [template] = await Promise.all([this.#initWidgetRoot()]);

        // we want to render the template only after the data was fetched
        // so we won't show the apps-list empty state until the data is loaded
        this.#renderTemplate(template);

        this.onWidgetRootReady();
      }
    },
);
