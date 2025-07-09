import { OutboundAppsListDriver } from '@descope/sdk-component-drivers';
import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import { loggerMixin } from '@descope/sdk-mixins';
import { getAppsList } from '../../../state/selectors';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';

export const initOutboundAppsListMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class InitAppsListMixinClass extends compose(
      stateManagementMixin,
      loggerMixin,
      initWidgetRootMixin,
    )(superclass) {
      appsList: OutboundAppsListDriver;

      #initAppsList(appsList: ReturnType<typeof getAppsList>) {
        this.appsList = new OutboundAppsListDriver(
          () => this.shadowRoot?.querySelector('descope-outbound-apps'),
          { logger: this.logger },
        );
        this.appsList.data = appsList;
      }

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();
        this.#initAppsList(getAppsList(this.state));
      }
    },
);
