import {
  FlowDriver,
  ModalDriver,
  UserAuthMethodDriver,
} from '@descope/sdk-component-drivers';
import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import {
  cookieConfigMixin,
  loggerMixin,
  modalMixin,
} from '@descope/sdk-mixins';
import { flowSyncThemeMixin } from '../../flowSyncThemeMixin';
import { createFlowTemplate } from '../../helpers';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';

export const initTenantSessionSettingsUserAuthMethodMixin =
  createSingletonMixin(
    <T extends CustomElementConstructor>(superclass: T) =>
      class TenantSessionSettingsUserAuthMethodMixinClass extends compose(
        flowSyncThemeMixin,
        stateManagementMixin,
        loggerMixin,
        initWidgetRootMixin,
        cookieConfigMixin,
        modalMixin,
      )(superclass) {
        TenantSessionSettingsUserAuthMethodDriver: UserAuthMethodDriver;

        #modal: ModalDriver;

        #flow: FlowDriver;

        #initModal() {
          if (!this.TenantSessionSettingsUserAuthMethodDriver.flowId) return;

          this.#modal = this.createModal({
            'data-id': 'session-settings',
          });
          this.#flow = new FlowDriver(
            () => this.#modal.ele?.querySelector('descope-wc'),
            { logger: this.logger },
          );
          this.#modal.afterClose = this.#initModalContent.bind(this);
          this.#initModalContent();
          this.syncFlowTheme(this.#flow);
        }

        #initModalContent() {
          this.#modal.setContent(
            createFlowTemplate({
              projectId: this.projectId,
              flowId: this.TenantSessionSettingsUserAuthMethodDriver.flowId,
              tenant: this.tenantId,
              baseUrl: this.baseUrl,
              baseStaticUrl: this.baseStaticUrl,
              baseCdnUrl: this.baseCdnUrl,
              refreshCookieName: this.refreshCookieName,
              theme: this.theme,
            }),
          );
          this.#flow.onSuccess(() => {
            this.#modal.close();
            this.actions.getTenant();
          });
        }

        #initSessionSettings() {
          this.TenantSessionSettingsUserAuthMethodDriver =
            new UserAuthMethodDriver(
              () =>
                this.shadowRoot?.querySelector(
                  'descope-user-auth-method[data-id="session-settings"]',
                ),
              { logger: this.logger },
            );

          this.TenantSessionSettingsUserAuthMethodDriver.onUnfulfilledButtonClick(
            () => {
              this.#modal?.open();
            },
          );
        }

        async onWidgetRootReady() {
          await super.onWidgetRootReady?.();

          this.#initSessionSettings();
          this.#initModal();
        }
      },
  );
