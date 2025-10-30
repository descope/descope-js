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
import { getTenantName } from '../../../state/selectors';
import { flowSyncThemeMixin } from '../../flowSyncThemeMixin';
import { createFlowTemplate } from '../../helpers';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';

export const initTenantPasswordPolicyUserAuthMethodMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class TenantPasswordPolicyUserAuthMethodMixinClass extends compose(
      flowSyncThemeMixin,
      stateManagementMixin,
      loggerMixin,
      initWidgetRootMixin,
      cookieConfigMixin,
      modalMixin,
    )(superclass) {
      TenantPasswordPolicyUserAuthMethodDriver: UserAuthMethodDriver;

      #modal: ModalDriver;

      #flow: FlowDriver;

      #initModal() {
        if (!this.TenantPasswordPolicyUserAuthMethodDriver.flowId) return;

        this.#modal = this.createModal({
          'data-id': 'password-policy',
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
            flowId: this.TenantPasswordPolicyUserAuthMethodDriver.flowId,
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

      #initPasswordPolicy() {
        this.TenantPasswordPolicyUserAuthMethodDriver =
          new UserAuthMethodDriver(
            () =>
              this.shadowRoot?.querySelector(
                'descope-user-auth-method[data-id="password-policy"]',
              ),
            { logger: this.logger },
          );

        this.TenantPasswordPolicyUserAuthMethodDriver.onUnfulfilledButtonClick(
          () => {
            this.#modal?.open();
          },
        );
      }

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        this.#initPasswordPolicy();
        this.#initModal();
      }
    },
);
