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
import { getTenantSSOExclusions } from '../../../state/selectors';
import { flowSyncThemeMixin } from '../../flowSyncThemeMixin';
import { createFlowTemplate } from '../../helpers';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';

export const initTenantSSOExclusionsMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class TenantSSOExclusionsMixinClass extends compose(
      flowSyncThemeMixin,
      stateManagementMixin,
      loggerMixin,
      initWidgetRootMixin,
      cookieConfigMixin,
      modalMixin,
    )(superclass) {
      tenantSSOExclusionsDriver: UserAttributeDriver;

      #editModal: ModalDriver;

      #editFlow: FlowDriver;

      #deleteModal: ModalDriver;

      #deleteFlow: FlowDriver;

      #initEditModal() {
        if (!this.tenantSSOExclusionsDriver.editFlowId) return;

        this.#editModal = this.createModal({
          'data-id': 'edit-tenant-sso-exclusions',
        });
        this.#editFlow = new FlowDriver(
          () => this.#editModal.ele?.querySelector('descope-wc'),
          { logger: this.logger },
        );
        this.#editModal.beforeOpen = this.#initEditModalContent.bind(this);
        this.#editModal.afterClose = this.#initEditModalContent.bind(this);
        this.#initEditModalContent();
        this.syncFlowTheme(this.#editFlow);
      }

      #initEditModalContent() {
        this.#editModal.setContent(
          createFlowTemplate({
            projectId: this.projectId,
            flowId: this.tenantSSOExclusionsDriver.editFlowId,
            tenant: this.tenantId,
            baseUrl: this.baseUrl,
            baseStaticUrl: this.baseStaticUrl,
            baseCdnUrl: this.baseCdnUrl,
            refreshCookieName: this.refreshCookieName,
            theme: this.theme,
            form: JSON.stringify({
              enforceSSOExclusions: getTenantSSOExclusions(this.state),
            }),
          }),
        );
        this.#editFlow.onSuccess(() => {
          this.#editModal.close();
          this.actions.getTenant();
        });
      }

      #initDeleteModal() {
        if (!this.tenantSSOExclusionsDriver.deleteFlowId) return;

        this.#deleteModal = this.createModal({
          'data-id': 'delete-tenant-sso-exclusions',
        });
        this.#deleteFlow = new FlowDriver(
          () => this.#deleteModal.ele?.querySelector('descope-wc'),
          { logger: this.logger },
        );
        this.#deleteModal.afterClose = this.#initDeleteModalContent.bind(this);
        this.#initDeleteModalContent();
        this.syncFlowTheme(this.#deleteFlow);
      }

      #initDeleteModalContent() {
        this.#deleteModal.setContent(
          createFlowTemplate({
            projectId: this.projectId,
            flowId: this.tenantSSOExclusionsDriver.deleteFlowId,
            tenant: this.tenantId,
            baseUrl: this.baseUrl,
            baseStaticUrl: this.baseStaticUrl,
            baseCdnUrl: this.baseCdnUrl,
            refreshCookieName: this.refreshCookieName,
            theme: this.theme,
          }),
        );
        this.#deleteFlow.onSuccess(() => {
          this.#deleteModal.close();
          this.actions.getTenant();
        });
      }

      #initTenantSSOExclusions() {
        this.tenantSSOExclusionsDriver = new UserAttributeDriver(
          () =>
            this.shadowRoot?.querySelector(
              'descope-user-attribute[data-id="tenant-force-sso-exclusions-edit"]',
            ),
          { logger: this.logger },
        );

        this.tenantSSOExclusionsDriver.onEditClick(() => {
          this.#editModal?.open();
        });

        this.tenantSSOExclusionsDriver.onDeleteClick(() => {
          this.#deleteModal?.open();
        });
      }

      #onValueUpdate = withMemCache(
        (
          ssoEnforceSSOExclusions: ReturnType<typeof getTenantSSOExclusions>,
        ) => {
          this.tenantSSOExclusionsDriver.value = ssoEnforceSSOExclusions;
        },
      );

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        this.#initTenantSSOExclusions();
        this.#initEditModal();
        this.#initDeleteModal();

        this.#onValueUpdate(getTenantSSOExclusions(this.state));

        this.subscribe(this.#onValueUpdate.bind(this), getTenantSSOExclusions);
      }
    },
);
