import {
  FlowDriver,
  ModalDriver,
  MultiSsoConfigurationsDriver,
} from '@descope/sdk-component-drivers';
import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import {
  loggerMixin,
  flowModalMixin,
  flowInputMixin,
} from '@descope/sdk-mixins';
import {
  getAdditionalSSOIds,
  getSSOConfigurations,
} from '../../../state/selectors';
import { flowSyncThemeMixin } from '../../flowSyncThemeMixin';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';

export const initMultiSsoConfigurationsMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class InitMultiSsoConfigurationsMixinClass extends compose(
      flowSyncThemeMixin,
      stateManagementMixin,
      flowModalMixin,
      loggerMixin,
      initWidgetRootMixin,
      flowInputMixin,
    )(superclass) {
      #multiSso: MultiSsoConfigurationsDriver;

      #createModal: ModalDriver;

      #createFlow: FlowDriver;

      #deleteModal: ModalDriver;

      #deleteFlow: FlowDriver;

      #editModal: ModalDriver;

      #editFlow: FlowDriver;

      #initCreateModal() {
        this.#createModal = this.createFlowModal({
          'data-id': 'multi-sso-create-modal',
        });

        this.#createFlow = new FlowDriver(
          () => this.#createModal.ele?.querySelector('descope-wc'),
          { logger: this.logger },
        );
        this.syncFlowTheme(this.#createFlow);
      }

      #initDeleteModal() {
        this.#deleteModal = this.createFlowModal({
          'data-id': 'multi-sso-delete-modal',
        });
        this.#deleteFlow = new FlowDriver(
          () => this.#deleteModal.ele?.querySelector('descope-wc'),
          { logger: this.logger },
        );
        this.syncFlowTheme(this.#deleteFlow);
      }

      #initEditModal() {
        this.#editModal = this.createFlowModal({
          'data-id': 'multi-sso-edit-modal',
        });
        this.#editFlow = new FlowDriver(
          () => this.#editModal.ele?.querySelector('descope-wc'),
          { logger: this.logger },
        );
        this.syncFlowTheme(this.#editFlow);
      }

      #openCreateModal(createFlowId: string) {
        this.#createModal.setContent(
          this.createFlowTemplate({
            flowId: createFlowId,
            tenant: this.tenantId,
          }),
        );
        this.#createModal.open();
        this.#createFlow.onSuccess(async () => {
          this.#createModal.close();
          await this.actions.getTenant();
          const ssoIds = getAdditionalSSOIds(this.state);
          await this.actions.getTenantAdminLinkSSO({ ssoIds });
        });
      }

      #openDeleteModal(deleteFlowId: string, id: string) {
        this.#deleteModal.setContent(
          this.createFlowTemplate({
            flowId: deleteFlowId,
            tenant: this.tenantId,
            form: { deleteSSOConfigurationId: id },
          }),
        );
        this.#deleteModal.open();
        this.#deleteFlow.onSuccess(() => {
          this.#deleteModal.close();
          this.actions.getTenant();
        });
      }

      // The edit flow is handed the configuration it was opened for, and what that configuration is
      // today, so the Descoper's flow can show the current state rather than guess it.
      #openEditModal(
        editFlowId: string,
        id: string,
        authenticationOnly?: boolean,
      ) {
        this.#editModal.setContent(
          this.createFlowTemplate({
            flowId: editFlowId,
            tenant: this.tenantId,
            form: {
              ssoConfigurationId: id,
              authenticationOnly: !!authenticationOnly,
            },
          }),
        );
        this.#editModal.open();
        this.#editFlow.onSuccess(async () => {
          this.#editModal.close();
          await this.actions.getTenant();
          const ssoIds = getAdditionalSSOIds(this.state);
          await this.actions.getTenantAdminLinkSSO({ ssoIds });
        });
      }

      #initFlowModals() {
        const { createFlowId, deleteFlowId, editFlowId } = this.#multiSso;

        if (deleteFlowId) {
          this.#initDeleteModal();
          this.#multiSso.onDeleteClicked(({ id }) =>
            this.#openDeleteModal(deleteFlowId, id),
          );
        }

        if (createFlowId) {
          this.#initCreateModal();
          this.#multiSso.onCreateClicked(() =>
            this.#openCreateModal(createFlowId),
          );
        }

        if (editFlowId) {
          this.#initEditModal();
          this.#multiSso.onEditClicked(({ id, authenticationOnly }) =>
            this.#openEditModal(editFlowId, id, authenticationOnly),
          );
        }
      }

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        this.#multiSso = new MultiSsoConfigurationsDriver(
          () => this.shadowRoot?.querySelector('descope-multi-sso'),
          { logger: this.logger },
        );

        if (!this.#multiSso.isExists) return;

        this.#initFlowModals();

        this.#multiSso.data = getSSOConfigurations(this.state);
        this.subscribe((configs) => {
          this.#multiSso.data = configs;
        }, getSSOConfigurations);
      }
    },
);
