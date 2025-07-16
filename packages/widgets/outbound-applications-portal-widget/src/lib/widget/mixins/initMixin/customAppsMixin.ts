import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import { debuggerMixin, themeMixin } from '@descope/sdk-mixins';
import { initWidgetRootMixin } from './initComponentsMixins/initWidgetRootMixin';

export const customAppsMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    // @ts-ignore
    class CustomAppsMixinClass extends compose(
      debuggerMixin,
      initWidgetRootMixin,
    )(superclass) {
      customAppsIds: string[];

      initAllowedAppIds() {
        const ids = this.getAttribute('allowed-outbound-apps-ids');
        this.customAppsIds = ids?.split?.(',').filter(Boolean) || [];
      }

      filterAllowedApps(appsList) {
        if (!this.customAppsIds.length) return appsList;
        return this.customAppsIds.map((id: string) =>
          appsList.find((app) => app.appId === id),
        );
      }

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        this.initAllowedAppIds();
      }
    },
);
