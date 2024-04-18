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
import { getEmail, getIsEmailVerified } from '../../../state/selectors';
import { createFlowTemplate } from '../../helpers';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';

export const initEmailUserAttrMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class EmailUserAttrMixinClass extends compose(
      stateManagementMixin,
      loggerMixin,
      initWidgetRootMixin,
      modalMixin,
    )(superclass) {
      emailUserAttr: UserAttributeDriver;

      #editModal: ModalDriver;

      #editFlow: FlowDriver;

      #deleteModal: ModalDriver;

      #deleteFlow: FlowDriver;

      #initEditModal() {
        this.#editModal = this.createModal({ 'data-id': 'edit-email' });
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
            flowId: this.emailUserAttr.editFlowId,
            baseUrl: this.baseUrl,
          }),
        );
        this.#editFlow.onSuccess(() => {
          this.#editModal.close();
          this.actions.getMe();
        });
      }

      #initDeleteModal() {
        this.#deleteModal = this.createModal({ 'data-id': 'delete-email' });
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
            flowId: this.emailUserAttr.deleteFlowId,
            baseUrl: this.baseUrl,
          }),
        );
        this.#deleteFlow.onSuccess(() => {
          this.#deleteModal.close();
          this.actions.getMe();
        });
      }

      #initEmailUserAttr() {
        this.emailUserAttr = new UserAttributeDriver(
          () =>
            this.shadowRoot?.querySelector(
              'descope-user-attribute[data-id="email"]',
            ),
          { logger: this.logger },
        );

        this.emailUserAttr.onEditClick(() => {
          this.#editModal.open();
        });

        this.emailUserAttr.onDeleteClick(() => {
          this.#deleteModal.open();
        });
      }

      #onValueUpdate = withMemCache((email: ReturnType<typeof getEmail>) => {
        this.emailUserAttr.value = email;
      });

      #onValueBadgeLabelUpdate = withMemCache(
        (isEmailVerified: ReturnType<typeof getIsEmailVerified>) => {
          this.emailUserAttr.badgeLabel = isEmailVerified ? '' : 'Unverified';
        },
      );

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        this.#initEmailUserAttr();
        this.#initEditModal();
        this.#initDeleteModal();

        this.#onValueUpdate(getEmail(this.state));
        this.#onValueBadgeLabelUpdate(getIsEmailVerified(this.state));

        this.subscribe(this.#onValueUpdate.bind(this), getEmail);

        this.subscribe(
          this.#onValueBadgeLabelUpdate.bind(this),
          getIsEmailVerified,
        );
      }
    },
);
