import {
  FlowButtonDriver,
  FlowDriver,
  ModalDriver,
  UserAttributeDriver,
} from '@descope/sdk-component-drivers';
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
import { getTenantName } from '../../../state/selectors';
import { flowSyncThemeMixin } from '../../flowSyncThemeMixin';
import { createFlowTemplate } from '../../helpers';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';

export const initTenantPasswordPolicyMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class TenantPasswordPolicyMixinClass extends compose(
      flowSyncThemeMixin,
      stateManagementMixin,
      loggerMixin,
      initWidgetRootMixin,
      cookieConfigMixin,
      modalMixin,
    )(superclass) {
      tenantPasswordPolicyDriver: FlowButtonDriver;

      #modal: ModalDriver;

      #flow: FlowDriver;

      #initModal() {
        if (!this.tenantPasswordPolicyDriver.flowId) return;

        this.#modal = this.createModal({
          'data-id': 'tenant-profile-set-password-policy',
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
            flowId: this.tenantPasswordPolicyDriver.flowId,
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
        this.tenantPasswordPolicyDriver = new FlowButtonDriver(
          () =>
            this.shadowRoot?.querySelector(
              'descope-user-attribute[data-id="edit-tenant-password-policy-button"]',
            ),
          { logger: this.logger },
        );

        this.tenantPasswordPolicyDriver.onClick(() => {
          this.#modal?.open();
        });
      }

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        this.#initPasswordPolicy();
        this.#initModal();
      }
    },
);
