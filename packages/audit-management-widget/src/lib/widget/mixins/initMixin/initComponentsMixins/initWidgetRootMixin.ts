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
          // await import('../../../../../../test/mocks/rootMock').then(
          //   (module) => module.default,
          // ),
          await this.fetchWidgetPage('root.html'),
        );
        await this.loadDescopeUiComponents(template);
        this.contentRootElement.append(template.content.cloneNode(true));
      }

      // eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-empty-function
      async onWidgetRootReady() {}

      async init() {
        await super.init?.();

        await Promise.all([this.#initWidgetRoot()]);

        this.onWidgetRootReady();
      }
    },
);
