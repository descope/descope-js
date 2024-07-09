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
import { loggerMixin, modalMixin } from '@descope/sdk-mixins';
import { getName } from '../../../state/selectors';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';
import { createFlowTemplate } from '../../helpers';

export const initNameUserAttrMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class NameUserAttrMixinClass extends compose(
      stateManagementMixin,
      loggerMixin,
      initWidgetRootMixin,
      modalMixin,
    )(superclass) {
      nameUserAttr: UserAttributeDriver;

      #editModal: ModalDriver;

      #editFlow: FlowDriver;

      #deleteModal: ModalDriver;

      #deleteFlow: FlowDriver;

      #initEditModal() {
        this.#editModal = this.createModal({ 'data-id': 'edit-name' });
        this.#editFlow = new FlowDriver(
          () => this.#editModal.ele?.querySelector('descope-wc'),
          { logger: this.logger },
        );
        this.#editModal.afterClose = this.#initEditModalContent.bind(this);
        this.#initEditModalContent();
      }

      #initEditModalContent() {
        this.#editModal.setContent(
          createFlowTemplate({
            projectId: this.projectId,
            flowId: this.nameUserAttr.editFlowId,
            baseUrl: this.baseUrl,
            baseStaticUrl: this.baseStaticUrl,
          }),
        );
        this.#editFlow.onSuccess(() => {
          this.#editModal.close();
          this.actions.getMe();
        });
      }

      #initDeleteModal() {
        this.#deleteModal = this.createModal({ 'data-id': 'delete-name' });
        this.#deleteFlow = new FlowDriver(
          () => this.#deleteModal.ele?.querySelector('descope-wc'),
          { logger: this.logger },
        );
        this.#deleteModal.afterClose = this.#initDeleteModalContent.bind(this);
        this.#initDeleteModalContent();
      }

      #initDeleteModalContent() {
        this.#deleteModal.setContent(
          createFlowTemplate({
            projectId: this.projectId,
            flowId: this.nameUserAttr.deleteFlowId,
            baseUrl: this.baseUrl,
            baseStaticUrl: this.baseStaticUrl,
          }),
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
          this.#editModal.open();
        });

        this.nameUserAttr.onDeleteClick(() => {
          this.#deleteModal.open();
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
