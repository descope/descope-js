import {
  FlowDriver,
  ModalDriver,
  UserAuthMethodDriver,
} from '@descope/sdk-component-drivers';
import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import {
  localeMixin,
  cookieConfigMixin,
  loggerMixin,
  modalMixin,
  flowInputMixin,
} from '@descope/sdk-mixins';
import { flowSyncThemeMixin } from '../../flowSyncThemeMixin';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';

export const initTenantPasswordPolicyUserAuthMethodMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class TenantPasswordPolicyUserAuthMethodMixinClass extends compose(
      localeMixin,
      flowSyncThemeMixin,
      stateManagementMixin,
      loggerMixin,
      initWidgetRootMixin,
      cookieConfigMixin,
      modalMixin,
      flowInputMixin,
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
          this.createFlowTemplate({
            flowId: this.TenantPasswordPolicyUserAuthMethodDriver.flowId,
            tenant: this.tenantId,
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
