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
import { getVerifiedRecoveryEmail } from '../../../state/selectors';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';
import { flowSyncThemeMixin } from '../../flowSyncThemeMixin';

export const initRecoveryEmailUserAttrMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class RecoveryEmailUserAttrMixinClass extends compose(
      localeMixin,
      flowSyncThemeMixin,
      stateManagementMixin,
      loggerMixin,
      initWidgetRootMixin,
      cookieConfigMixin,
      modalMixin,
      flowInputMixin,
    )(superclass) {
      recoveryEmailUserAttr: UserAttributeDriver;

      #editModal: ModalDriver;

      #editFlow: FlowDriver;

      #deleteModal: ModalDriver;

      #deleteFlow: FlowDriver;

      #initEditModal() {
        if (!this.recoveryEmailUserAttr.editFlowId) return;

        this.#editModal = this.createModal({
          'data-id': 'edit-recovery-email',
          'close-on-outside-click': 'true',
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
          this.createFlowTemplate({
            flowId: this.recoveryEmailUserAttr.editFlowId,
          }),
        );
        this.#editFlow.onSuccess(() => {
          this.#editModal.close();
          this.actions.getMe();
        });
      }

      #initDeleteModal() {
        if (!this.recoveryEmailUserAttr.deleteFlowId) return;

        this.#deleteModal = this.createModal({
          'data-id': 'delete-recovery-email',
          'close-on-outside-click': 'true',
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
          this.createFlowTemplate({
            flowId: this.recoveryEmailUserAttr.deleteFlowId,
          }),
        );
        this.#deleteFlow.onSuccess(() => {
          this.#deleteModal.close();
          this.actions.getMe();
        });
      }

      #initRecoveryEmailUserAttr() {
        this.recoveryEmailUserAttr = new UserAttributeDriver(
          () =>
            this.shadowRoot?.querySelector(
              'descope-user-attribute[data-id="recoveryEmail"]',
            ),
          { logger: this.logger },
        );

        this.recoveryEmailUserAttr.onEditClick(() => {
          this.#editModal?.open();
        });

        this.recoveryEmailUserAttr.onDeleteClick(() => {
          this.#deleteModal?.open();
        });
      }

      #onValueUpdate = withMemCache(
        (recoveryEmail: ReturnType<typeof getVerifiedRecoveryEmail>) => {
          this.recoveryEmailUserAttr.value = recoveryEmail;
        },
      );

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        this.#initRecoveryEmailUserAttr();
        this.#initEditModal();
        this.#initDeleteModal();

        this.#onValueUpdate(getVerifiedRecoveryEmail(this.state));

        this.subscribe(
          this.#onValueUpdate.bind(this),
          getVerifiedRecoveryEmail,
        );
      }
    },
);
