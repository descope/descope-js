import { LinkDriver } from '@descope/sdk-component-drivers';
import {
  compose,
  createSingletonMixin,
  withMemCache,
} from '@descope/sdk-helpers';
import {
  cookieConfigMixin,
  loggerMixin,
  modalMixin,
} from '@descope/sdk-mixins';
import { getTenantDefaultSSOLink } from '../../../state/selectors';
import { flowSyncThemeMixin } from '../../flowSyncThemeMixin';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';

export const initTenantAdminLinkSSOMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class TenantAdminLinkSSOMixinClass extends compose(
      flowSyncThemeMixin,
      stateManagementMixin,
      loggerMixin,
      initWidgetRootMixin,
      cookieConfigMixin,
      modalMixin,
    )(superclass) {
      tenantAdminLinkSSODriver: LinkDriver;

      #initTenantAdminLinkSSO() {
        this.tenantAdminLinkSSODriver = new LinkDriver(
          () =>
            this.shadowRoot?.querySelector(
              'descope-link[data-id="tenant-admin-link-sso"]',
            ),
          { logger: this.logger },
        );
      }

      #onValueUpdate = withMemCache(
        (tenantAdminLinkSSO: ReturnType<typeof getTenantDefaultSSOLink>) => {
          this.tenantAdminLinkSSODriver.href = tenantAdminLinkSSO;
        },
      );

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        this.#initTenantAdminLinkSSO();

        this.#onValueUpdate(getTenantDefaultSSOLink(this.state));

        this.subscribe(this.#onValueUpdate.bind(this), getTenantDefaultSSOLink);
      }
    },
);
