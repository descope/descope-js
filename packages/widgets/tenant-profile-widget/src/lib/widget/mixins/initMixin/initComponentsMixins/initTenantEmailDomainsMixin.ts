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
  localeMixin,
  cookieConfigMixin,
  loggerMixin,
  modalMixin,
  flowInputMixin,
} from '@descope/sdk-mixins';
import { getTenantEmailDomains } from '../../../state/selectors';
import { flowSyncThemeMixin } from '../../flowSyncThemeMixin';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';

export const initTenantEmailDomainsMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class TenantEmailDomainsMixinClass extends compose(
      localeMixin,
      flowSyncThemeMixin,
      stateManagementMixin,
      loggerMixin,
      initWidgetRootMixin,
      cookieConfigMixin,
      modalMixin,
      flowInputMixin,
    )(superclass) {
      tenantEmailDomainsDriver: UserAttributeDriver;

      #editModal: ModalDriver;

      #editFlow: FlowDriver;

      #deleteModal: ModalDriver;

      #deleteFlow: FlowDriver;

      #initEditModal() {
        if (!this.tenantEmailDomainsDriver.editFlowId) return;

        this.#editModal = this.createModal({
          'data-id': 'edit-tenant-email-domains',
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
          this.createFlowTemplate({
            flowId: this.tenantEmailDomainsDriver.editFlowId,
            tenant: this.tenantId,
            form: {
              tenantEmailDomains: getTenantEmailDomains(this.state),
            },
          }),
        );
        this.#editFlow.onSuccess(() => {
          this.#editModal.close();
          this.actions.getTenant();
        });
      }

      #initDeleteModal() {
        if (!this.tenantEmailDomainsDriver.deleteFlowId) return;

        this.#deleteModal = this.createModal({
          'data-id': 'delete-tenant-email-domains',
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
          this.createFlowTemplate({
            flowId: this.tenantEmailDomainsDriver.deleteFlowId,
            tenant: this.tenantId,
          }),
        );
        this.#deleteFlow.onSuccess(() => {
          this.#deleteModal.close();
          this.actions.getTenant();
        });
      }

      #initTenantEmailDomains() {
        this.tenantEmailDomainsDriver = new UserAttributeDriver(
          () =>
            this.shadowRoot?.querySelector(
              'descope-user-attribute[data-id="tenant-email-domains-edit"]',
            ),
          { logger: this.logger },
        );

        this.tenantEmailDomainsDriver.onEditClick(() => {
          this.#editModal?.open();
        });

        this.tenantEmailDomainsDriver.onDeleteClick(() => {
          this.#deleteModal?.open();
        });
      }

      #onValueUpdate = withMemCache(
        (tenantEmailDomains: ReturnType<typeof getTenantEmailDomains>) => {
          this.tenantEmailDomainsDriver.value = tenantEmailDomains;
        },
      );

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        this.#initTenantEmailDomains();
        this.#initEditModal();
        this.#initDeleteModal();

        this.#onValueUpdate(getTenantEmailDomains(this.state));

        this.subscribe(this.#onValueUpdate.bind(this), getTenantEmailDomains);
      }
    },
);
