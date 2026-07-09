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
  loggerMixin,
  modalMixin,
  cookieConfigMixin,
  flowInputMixin,
} from '@descope/sdk-mixins';
import { getPhone, getPhoneBadgeLabel } from '../../../state/selectors';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';
import { flowSyncThemeMixin } from '../../flowSyncThemeMixin';

export const initPhoneUserAttrMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class PhoneUserAttrMixinClass extends compose(
      localeMixin,
      flowSyncThemeMixin,
      stateManagementMixin,
      loggerMixin,
      initWidgetRootMixin,
      cookieConfigMixin,
      modalMixin,
      flowInputMixin,
    )(superclass) {
      phoneUserAttr: UserAttributeDriver;

      #editModal: ModalDriver;

      #editFlow: FlowDriver;

      #deleteModal: ModalDriver;

      #deleteFlow: FlowDriver;

      #initEditModal() {
        if (!this.phoneUserAttr.editFlowId) return;

        this.#editModal = this.createModal({
          'data-id': 'edit-phone',
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
          this.createFlowTemplate({ flowId: this.phoneUserAttr.editFlowId }),
        );
        this.#editFlow.onSuccess(() => {
          this.#editModal.close();
          this.actions.getMe();
        });
      }

      #initDeleteModal() {
        if (!this.phoneUserAttr.deleteFlowId) return;

        this.#deleteModal = this.createModal({
          'data-id': 'delete-phone',
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
          this.createFlowTemplate({ flowId: this.phoneUserAttr.deleteFlowId }),
        );
        this.#deleteFlow.onSuccess(() => {
          this.#deleteModal.close();
          this.actions.getMe();
        });
      }

      #initPhoneUserAttr() {
        this.phoneUserAttr = new UserAttributeDriver(
          () =>
            this.shadowRoot?.querySelector(
              'descope-user-attribute[data-id="phone"]',
            ),
          { logger: this.logger },
        );

        this.phoneUserAttr.onEditClick(() => {
          this.#editModal?.open();
        });

        this.phoneUserAttr.onDeleteClick(() => {
          this.#deleteModal?.open();
        });
      }

      #onValueUpdate = withMemCache((phone: ReturnType<typeof getPhone>) => {
        this.phoneUserAttr.value = phone;
      });

      #onBadgeLabelUpdate = withMemCache(
        (badgeLabel: ReturnType<typeof getPhoneBadgeLabel>) => {
          this.phoneUserAttr.badgeLabel = badgeLabel;
        },
      );

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        this.#initPhoneUserAttr();
        this.#initEditModal();
        this.#initDeleteModal();

        this.#onValueUpdate(getPhone(this.state));
        this.#onBadgeLabelUpdate(getPhoneBadgeLabel(this.state));

        this.subscribe(this.#onValueUpdate.bind(this), getPhone);
        this.subscribe(this.#onBadgeLabelUpdate.bind(this), getPhoneBadgeLabel);
      }
    },
);
