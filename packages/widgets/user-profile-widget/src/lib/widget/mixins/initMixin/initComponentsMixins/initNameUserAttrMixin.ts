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
} from '@descope/sdk-mixins';
import { getName } from '../../../state/selectors';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';
import { flowInputMixin } from '../../flowInputMixin';
import { flowSyncThemeMixin } from '../../flowSyncThemeMixin';

export const initNameUserAttrMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class NameUserAttrMixinClass extends compose(
      localeMixin,
      flowSyncThemeMixin,
      stateManagementMixin,
      loggerMixin,
      initWidgetRootMixin,
      cookieConfigMixin,
      modalMixin,
      flowInputMixin,
    )(superclass) {
      nameUserAttr: UserAttributeDriver;

      #editModal: ModalDriver;

      #editFlow: FlowDriver;

      #deleteModal: ModalDriver;

      #deleteFlow: FlowDriver;

      #initEditModal() {
        if (!this.nameUserAttr.editFlowId) return;

        this.#editModal = this.createModal({ 'data-id': 'edit-name' });
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
          this.buildFlowTemplate({ flowId: this.nameUserAttr.editFlowId }),
        );
        this.#editFlow.onSuccess(() => {
          this.#editModal.close();
          this.actions.getMe();
        });
      }

      #initDeleteModal() {
        if (!this.nameUserAttr.deleteFlowId) return;

        this.#deleteModal = this.createModal({ 'data-id': 'delete-name' });
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
          this.buildFlowTemplate({ flowId: this.nameUserAttr.deleteFlowId }),
        );
        this.#deleteFlow.onSuccess(() => {
          this.#deleteModal.close();
          this.actions.getMe();
        });
      }

      #initNameUserAttr() {
        this.nameUserAttr = new UserAttributeDriver(
          () =>
            this.shadowRoot?.querySelector(
              'descope-user-attribute[data-id="name"]',
            ),
          { logger: this.logger },
        );

        this.nameUserAttr.onEditClick(() => {
          this.#editModal?.open();
        });

        this.nameUserAttr.onDeleteClick(() => {
          this.#deleteModal?.open();
        });
      }

      #onValueUpdate = withMemCache((name: ReturnType<typeof getName>) => {
        this.nameUserAttr.value = name;
      });

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        this.#initNameUserAttr();
        this.#initEditModal();
        this.#initDeleteModal();

        this.#onValueUpdate(getName(this.state));

        this.subscribe(this.#onValueUpdate.bind(this), getName);
      }
    },
);
