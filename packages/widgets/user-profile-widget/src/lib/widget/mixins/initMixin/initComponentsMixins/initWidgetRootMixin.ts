import {
  compose,
  createSingletonMixin,
  createTemplate,
  decodeJWT,
} from '@descope/sdk-helpers';
import {
  descopeUiMixin,
  initElementMixin,
  initLifecycleMixin,
  loggerMixin,
} from '@descope/sdk-mixins';
import { getSessionToken } from '@descope/web-js-sdk';
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
          // await import('../../../../../../test/mocks/rootMock').then(module => module.default)
          await this.fetchWidgetPage('root.html'),
        );

        await this.loadDescopeUiComponents(template);
        this.contentRootElement.append(template.content.cloneNode(true));
      }

      #parseCurrentTenantFromSessionToken() {
        const sessionToken = getSessionToken();
        const claims = sessionToken ? decodeJWT(sessionToken) : null;
        return claims?.dct || null;
      }

      // eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-empty-function
      async onWidgetRootReady() {}

      async init() {
        await super.init?.();
        await this.actions.getMe();
        this.actions.setCurrentTenantId(
          this.#parseCurrentTenantFromSessionToken(),
        );
        await this.#initWidgetRoot();
        await this.onWidgetRootReady();
        this.dispatchEvent(new CustomEvent('ready'));
      }
    },
);
