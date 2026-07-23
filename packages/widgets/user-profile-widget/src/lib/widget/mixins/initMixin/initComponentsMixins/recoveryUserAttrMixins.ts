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
import {
  getVerifiedRecoveryEmail,
  getVerifiedRecoveryPhone,
} from '../../../state/selectors';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';
import { flowSyncThemeMixin } from '../../flowSyncThemeMixin';

// Email and phone recovery attributes behave identically (mirror the email/phone user-attribute
// pattern): a descope-user-attribute launches its set/delete flow in a modal and refreshes on
// success. Only the data-id, modal ids and value selector differ, so both are built from one
// factory. The value is gated on verified — an unverified/pending recovery renders empty.
const createRecoveryUserAttrMixin = (config: {
  dataId: string;
  editModalId: string;
  deleteModalId: string;
  getValue: (state: unknown) => string;
}) =>
  createSingletonMixin(
    <T extends CustomElementConstructor>(superclass: T) =>
      class RecoveryUserAttrMixinClass extends compose(
        localeMixin,
        flowSyncThemeMixin,
        stateManagementMixin,
        loggerMixin,
        initWidgetRootMixin,
        cookieConfigMixin,
        modalMixin,
        flowInputMixin,
      )(superclass) {
        recoveryUserAttr: UserAttributeDriver;

        #editModal: ModalDriver;

        #editFlow: FlowDriver;

        #deleteModal: ModalDriver;

        #deleteFlow: FlowDriver;

        #initEditModal() {
          if (!this.recoveryUserAttr.editFlowId) return;

          this.#editModal = this.createModal({
            'data-id': config.editModalId,
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
              flowId: this.recoveryUserAttr.editFlowId,
            }),
          );
          this.#editFlow.onSuccess(() => {
            this.#editModal.close();
            this.actions.getMe();
          });
        }

        #initDeleteModal() {
          if (!this.recoveryUserAttr.deleteFlowId) return;

          this.#deleteModal = this.createModal({
            'data-id': config.deleteModalId,
            'close-on-outside-click': 'true',
          });
          this.#deleteFlow = new FlowDriver(
            () => this.#deleteModal.ele?.querySelector('descope-wc'),
            { logger: this.logger },
          );
          this.#deleteModal.afterClose =
            this.#initDeleteModalContent.bind(this);
          this.#initDeleteModalContent();
          this.syncFlowTheme(this.#deleteFlow);
        }

        #initDeleteModalContent() {
          this.#deleteModal.setContent(
            this.createFlowTemplate({
              flowId: this.recoveryUserAttr.deleteFlowId,
            }),
          );
          this.#deleteFlow.onSuccess(() => {
            this.#deleteModal.close();
            this.actions.getMe();
          });
        }

        #initRecoveryUserAttr() {
          this.recoveryUserAttr = new UserAttributeDriver(
            () =>
              this.shadowRoot?.querySelector(
                `descope-user-attribute[data-id="${config.dataId}"]`,
              ),
            { logger: this.logger },
          );

          this.recoveryUserAttr.onEditClick(() => {
            this.#editModal?.open();
          });

          this.recoveryUserAttr.onDeleteClick(() => {
            this.#deleteModal?.open();
          });
        }

        #onValueUpdate = withMemCache((value: string) => {
          this.recoveryUserAttr.value = value;
        });

        async onWidgetRootReady() {
          await super.onWidgetRootReady?.();

          this.#initRecoveryUserAttr();
          this.#initEditModal();
          this.#initDeleteModal();

          this.#onValueUpdate(config.getValue(this.state));
          this.subscribe(this.#onValueUpdate.bind(this), config.getValue);
        }
      },
  );

export const initRecoveryEmailUserAttrMixin = createRecoveryUserAttrMixin({
  dataId: 'recoveryEmail',
  editModalId: 'edit-recovery-email',
  deleteModalId: 'delete-recovery-email',
  getValue: getVerifiedRecoveryEmail,
});

export const initRecoveryPhoneUserAttrMixin = createRecoveryUserAttrMixin({
  dataId: 'recoveryPhone',
  editModalId: 'edit-recovery-phone',
  deleteModalId: 'delete-recovery-phone',
  getValue: getVerifiedRecoveryPhone,
});
