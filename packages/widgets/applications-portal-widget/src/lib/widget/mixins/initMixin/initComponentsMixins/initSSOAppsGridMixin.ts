import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import { loggerMixin } from '@descope/sdk-mixins';
import { getSamlApps } from '../../../state/selectors';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';

export const initSSOAppsGridMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class InitSSOAppsGridMixinClass extends compose(
      stateManagementMixin,
      loggerMixin,
      initWidgetRootMixin,
    )(superclass) {
      // eslint-disable-next-line class-methods-use-this
      #initSSOAppsGrid(ssoAppsList: ReturnType<typeof getSamlApps>) {
        // TO-DO
        // eslint-disable-next-line no-console
        this.shadowRoot.innerHTML = ssoAppsList.map((ssoApp) => `
        <a target="_blank" href="${ssoApp.samlSettings.idpInitiatedUrl.replace('https://api.descope.org', 'http://localhost:8000')}">
          <div>${ssoApp.name}</div>
          <img src="${ssoApp.logo}"></img>
        </a>
        `).join('');
      }

      // talk with GuyP about setting up local environment

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();
        this.#initSSOAppsGrid(getSamlApps(this.state));
      }
    },
);
