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
import { getTenantName } from '../../../state/selectors';
import { flowSyncThemeMixin } from '../../flowSyncThemeMixin';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';

export const initTenantNameMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class TenantNameMixinClass extends compose(
      localeMixin,
      flowSyncThemeMixin,
      stateManagementMixin,
      loggerMixin,
      initWidgetRootMixin,
      cookieConfigMixin,
      modalMixin,
      flowInputMixin,
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
        this.#editModal.beforeOpen = this.#initEditModalContent.bind(this);
        this.#initEditModalContent();
        this.syncFlowTheme(this.#editFlow);
      }

      #initEditModalContent() {
        this.#editModal.setContent(
          this.createFlowTemplate({
            flowId: this.tenantNameDriver.editFlowId,
            tenant: this.tenantId,
            form: { tenantName: getTenantName(this.state) },
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
