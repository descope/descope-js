import {
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
import { getTenantEnforceSSO } from '../../../state/selectors';
import { flowSyncThemeMixin } from '../../flowSyncThemeMixin';
import { createFlowTemplate } from '../../helpers';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';

export const initTenantEnforceSSOMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class TenantEnforceSSOMixinClass extends compose(
      flowSyncThemeMixin,
      stateManagementMixin,
      loggerMixin,
      initWidgetRootMixin,
      cookieConfigMixin,
      modalMixin,
    )(superclass) {
      tenantEnforceSSODriver: UserAttributeDriver;

      #editModal: ModalDriver;

      #editFlow: FlowDriver;

      #deleteModal: ModalDriver;

      #deleteFlow: FlowDriver;

      #initEditModal() {
        if (!this.tenantEnforceSSODriver.editFlowId) return;

        this.#editModal = this.createModal({
          'data-id': 'edit-tenant-enforce-sso',
        });
        this.#editFlow = new FlowDriver(
          () => this.#editModal.ele?.querySelector('descope-wc'),
          { logger: this.logger },
        );
        this.#editModal.beforeOpen = this.#initEditModalContent.bind(this);
        this.#initEditModalContent();
        this.syncFlowTheme(this.#editFlow);
      }

      #initEditModalContent() {
        this.#editModal.setContent(
          createFlowTemplate({
            projectId: this.projectId,
            flowId: this.tenantEnforceSSODriver.editFlowId,
            tenant: this.tenantId,
            baseUrl: this.baseUrl,
            baseStaticUrl: this.baseStaticUrl,
            baseCdnUrl: this.baseCdnUrl,
            refreshCookieName: this.refreshCookieName,
            theme: this.theme,
            'style-id': this.styleId,
            form: JSON.stringify({
              enforceSSO: getTenantEnforceSSO(this.state),
            }),
          }),
        );
        this.#editFlow.onSuccess(() => {
          this.#editModal.close();
          this.actions.getTenant();
        });
      }

      #initDeleteModal() {
        if (!this.tenantEnforceSSODriver.deleteFlowId) return;

        this.#deleteModal = this.createModal({
          'data-id': 'delete-tenant-enforce-sso',
        });
        this.#deleteFlow = new FlowDriver(
          () => this.#deleteModal.ele?.querySelector('descope-wc'),
          { logger: this.logger },
        );
        this.#deleteModal.beforeOpen = this.#initDeleteModalContent.bind(this);
        this.#initDeleteModalContent();
        this.syncFlowTheme(this.#deleteFlow);
      }

      #initDeleteModalContent() {
        this.#deleteModal.setContent(
          createFlowTemplate({
            projectId: this.projectId,
            flowId: this.tenantEnforceSSODriver.deleteFlowId,
            tenant: this.tenantId,
            baseUrl: this.baseUrl,
            baseStaticUrl: this.baseStaticUrl,
            baseCdnUrl: this.baseCdnUrl,
            refreshCookieName: this.refreshCookieName,
            theme: this.theme,
            'style-id': this.styleId,
          }),
        );
        this.#deleteFlow.onSuccess(() => {
          this.#deleteModal.close();
          this.actions.getTenant();
        });
      }

      #initTenantEnforceSSO() {
        this.tenantEnforceSSODriver = new UserAttributeDriver(
          () =>
            this.shadowRoot?.querySelector(
              'descope-user-attribute[data-id="tenant-enforce-sso-edit"]',
            ),
          { logger: this.logger },
        );

        this.tenantEnforceSSODriver.onEditClick(() => {
          this.#editModal?.open();
        });

        this.tenantEnforceSSODriver.onDeleteClick(() => {
          this.#deleteModal?.open();
        });
      }

      #onValueUpdate = withMemCache(
        (tenantEnforceSSO: ReturnType<typeof getTenantEnforceSSO>) => {
          this.tenantEnforceSSODriver.value = tenantEnforceSSO;
        },
      );

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        this.#initTenantEnforceSSO();
        this.#initEditModal();
        this.#initDeleteModal();

        this.#onValueUpdate(getTenantEnforceSSO(this.state));

        this.subscribe(this.#onValueUpdate.bind(this), getTenantEnforceSSO);
      }
    },
);
