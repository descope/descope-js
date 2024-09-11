import { AppsListDriver } from '@descope/sdk-component-drivers';
import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import { loggerMixin } from '@descope/sdk-mixins';
import { getAppsList } from '../../../state/selectors';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';

export const initAppsListMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class InitAppsListMixinClass extends compose(
      stateManagementMixin,
      loggerMixin,
      initWidgetRootMixin,
    )(superclass) {
      appsList: AppsListDriver;


      #initAppsList(appsList: ReturnType<typeof getAppsList>) {
        this.appsList = new AppsListDriver( () => this.shadowRoot?.querySelector('descope-apps-list'), { logger: this.logger });
        this.appsList.data = appsList;
      }

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();
        this.#initAppsList(getAppsList(this.state));
      }
    },
);
