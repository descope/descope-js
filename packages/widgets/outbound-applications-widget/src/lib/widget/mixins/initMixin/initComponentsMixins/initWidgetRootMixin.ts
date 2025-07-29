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
import { getUserId } from '../../../state/selectors';

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
      static get observedAttributes() {
        return ['allowed-outbound-apps-ids'];
      }

      async #initWidgetRoot() {
        const template = createTemplate(
          // await import('../../../../../../test/mocks/rootMock').then(
          //   (module) => module.default,
          // ),
          await this.fetchWidgetPage('root.html'),
        );
        await this.loadDescopeUiComponents(template);

        return template;
      }

      #renderTemplate(template: HTMLTemplateElement) {
        this.contentRootElement.append(template.content.cloneNode(true));
      }

      attributeChangedCallback(
        name: string,
        oldValue: string,
        newValue: string,
      ) {
        if (name === 'allowed-outbound-apps-ids' && oldValue !== newValue) {
          this.actions.setAllowedAppsIds(this.#allowedIds);
        }
      }

      get #allowedIds() {
        const hasAttr = this.hasAttribute('allowed-outbound-apps-ids');
        if (!hasAttr) return undefined;

        const ids = this.getAttribute('allowed-outbound-apps-ids');
        if (hasAttr && !ids) return [];

        return ids
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      }

      // eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-empty-function
      async onWidgetRootReady() {}

      async init() {
        await super.init?.();

        await this.actions.getMe();

        // const allowedAppsIds = this.getAttribute('allowed-outbound-apps-ids');
        await this.actions.setAllowedAppsIds(this.#allowedIds);

        await Promise.all([
          this.actions.getOutboundApps(),
          this.actions.getConnectedOutboundApps({
            userId: getUserId(this.state),
          }),
        ]);

        const template = await this.#initWidgetRoot();

        // we want to render the template only after the data was fetched
        // so we won't show the apps-list empty state until the data is loaded
        this.#renderTemplate(template);

        this.onWidgetRootReady();
      }
    },
);
