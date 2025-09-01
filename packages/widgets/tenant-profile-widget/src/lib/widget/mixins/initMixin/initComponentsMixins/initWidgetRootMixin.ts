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
import {
  getMeError,
  getTenantAdminLinkSSOError,
  getTenantError,
} from '../../../state/selectors';
import { fetchWidgetPagesMixin } from '../../fetchWidgetPagesMixin';
import { stateManagementMixin } from '../../stateManagementMixin';
import { createErrorComponent } from './ErrorComponent';

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
        /*
        const importRoot = await import(
          '../../../../../../test/mocks/rootMock'
        ).then((module) => module.default);
        */

        const template = createTemplate(
          // importRoot,
          await this.fetchWidgetPage('root.html'),
        );

        await this.loadDescopeUiComponents(template);
        this.contentRootElement.append(template.content.cloneNode(true));
      }

      // eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-empty-function
      async onWidgetRootReady() {}

      async init() {
        await super.init?.();

        try {
          await Promise.all([
            this.actions.getMe(),
            this.actions.getTenant(),
            this.actions.getTenantAdminLinkSSO(),
          ]);
        } catch (e) {
          // Errors are handled in state, but catch just in case
        }

        // Check for errors in state
        const error =
          getMeError(this.state) ||
          getTenantError(this.state) ||
          getTenantAdminLinkSSOError(this.state);

        if (error) {
          this.contentRootElement.innerHTML = '';
          const mainMessage =
            typeof error === 'object' && error !== null && 'message' in error
              ? (error.message as string)
              : String(error) || 'An error occurred';
          this.contentRootElement.append(createErrorComponent({ mainMessage }));
          return;
        }

        await this.#initWidgetRoot();
        this.onWidgetRootReady();
      }
    },
);
