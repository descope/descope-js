import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import { loggerMixin } from '@descope/sdk-mixins';
import { getSSOApps } from '../../../state/selectors';
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
      #initSSOAppsGrid(ssoAppsList: ReturnType<typeof getSSOApps>) {
        // TO-DO
        // eslint-disable-next-line no-console
        console.log('DEBUG initSSOAppsGrid, got sso apps = ', ssoAppsList);
      }

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();
        this.#initSSOAppsGrid(getSSOApps(this.state));
      }
    },
);
