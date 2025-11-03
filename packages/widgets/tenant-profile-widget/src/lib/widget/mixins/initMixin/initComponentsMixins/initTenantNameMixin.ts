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
import { getTenantName } from '../../../state/selectors';
import { flowSyncThemeMixin } from '../../flowSyncThemeMixin';
import { createFlowTemplate } from '../../helpers';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';

export const initTenantNameMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class TenantNameMixinClass extends compose(
      flowSyncThemeMixin,
      stateManagementMixin,
      loggerMixin,
      initWidgetRootMixin,
      cookieConfigMixin,
      modalMixin,
    )(superclass) {
      tenantNameDriver: UserAttributeDriver;

      #editModal: ModalDriver;

      #editFlow: FlowDriver;

      #initEditModal() {
        if (!this.tenantNameDriver.editFlowId) return;

        this.#editModal = this.createModal({
          'data-id': 'tenant-profile-set-name',
        });
        this.#editFlow = new FlowDriver(
          () => this.#editModal.ele?.querySelector('descope-wc'),
          { logger: this.logger },
        );
        this.#editModal.afterClose = this.#initEditModalContent.bind(this);
        this.#initEditModalContent();
        this.syncFlowTheme(this.#editFlow);
      }

      #initEditModalContent() {
        this.#editModal.setContent(
          createFlowTemplate({
            projectId: this.projectId,
            flowId: this.tenantNameDriver.editFlowId,
            tenant: this.tenantId,
            baseUrl: this.baseUrl,
            baseStaticUrl: this.baseStaticUrl,
            baseCdnUrl: this.baseCdnUrl,
            refreshCookieName: this.refreshCookieName,
            theme: this.theme,
            'style-id': this.styleId,
            form: JSON.stringify({ tenantName: getTenantName(this.state) }),
          }),
        );
        this.#editFlow.onSuccess(() => {
          this.#editModal.close();
          this.actions.getTenant();
        });
      }

      #initTenantName() {
        this.tenantNameDriver = new UserAttributeDriver(
          () =>
            this.shadowRoot?.querySelector(
              'descope-user-attribute[data-id="tenant-name-edit"]',
            ),
          { logger: this.logger },
        );

        this.tenantNameDriver.onEditClick(() => {
          this.#editModal?.open();
        });
      }

      #onValueUpdate = withMemCache(
        (tenantName: ReturnType<typeof getTenantName>) => {
          this.tenantNameDriver.value = tenantName;
        },
      );

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        this.#initTenantName();
        this.#initEditModal();

        this.#onValueUpdate(getTenantName(this.state));

        this.subscribe(this.#onValueUpdate.bind(this), getTenantName);
      }
    },
);
