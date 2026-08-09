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
import { getEmail, getEmailBadgeLabel } from '../../../state/selectors';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';
import { flowSyncThemeMixin } from '../../flowSyncThemeMixin';

export const initEmailUserAttrMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class EmailUserAttrMixinClass extends compose(
      localeMixin,
      flowSyncThemeMixin,
      stateManagementMixin,
      loggerMixin,
      initWidgetRootMixin,
      cookieConfigMixin,
      modalMixin,
      flowInputMixin,
    )(superclass) {
      emailUserAttr: UserAttributeDriver;

      #editModal: ModalDriver;

      #editFlow: FlowDriver;

      #deleteModal: ModalDriver;

      #deleteFlow: FlowDriver;

      #initEditModal() {
        if (!this.emailUserAttr.editFlowId) return;

        this.#editModal = this.createModal({
          'data-id': 'edit-email',
          'close-on-outside-click': 'true',
        });
        this.#editFlow = new FlowDriver(
          () => this.#editModal.ele?.querySelector('descope-wc'),
          { logger: this.logger },
        );
        this.#editModal.afterClose = this.#initEditModalContent.bind(this);
        this.syncFlowTheme(this.#editFlow);
      }

      #initEditModalContent() {
        this.#editModal.setContent(
          this.createFlowTemplate({ flowId: this.emailUserAttr.editFlowId }),
        );
        this.#editFlow.onSuccess(() => {
          this.#editModal.close();
          this.actions.getMe();
        });
      }

      #initDeleteModal() {
        if (!this.emailUserAttr.deleteFlowId) return;

        this.#deleteModal = this.createModal({
          'data-id': 'delete-email',
          'close-on-outside-click': 'true',
        });
        this.#deleteFlow = new FlowDriver(
          () => this.#deleteModal.ele?.querySelector('descope-wc'),
          { logger: this.logger },
        );
        this.#deleteModal.afterClose = this.#initDeleteModalContent.bind(this);
        this.syncFlowTheme(this.#deleteFlow);
      }

      #initDeleteModalContent() {
        this.#deleteModal.setContent(
          this.createFlowTemplate({ flowId: this.emailUserAttr.deleteFlowId }),
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
          this.#editModal?.open();
        });

        this.emailUserAttr.onDeleteClick(() => {
          this.#deleteModal?.open();
        });
      }

      // (Re)build each modal's preloaded flow whenever the value changes. The
      // first (seeding) call preloads it; a later change (e.g. a delete) rebuilds
      // it so the flow re-fetches fresh data instead of the value it captured
      // before. Skip a modal that is open - rebuilding would drop the flow the
      // user is interacting with.
      #refreshModalsContent() {
        if (this.#editModal?.isClosed) {
          this.#initEditModalContent();
        }
        if (this.#deleteModal?.isClosed) {
          this.#initDeleteModalContent();
        }
      }

      #onValueUpdate = withMemCache((email: ReturnType<typeof getEmail>) => {
        this.emailUserAttr.value = email;
        this.#refreshModalsContent();
      });

      #onBadgeLabelUpdate = withMemCache(
        (badgeLabel: ReturnType<typeof getEmailBadgeLabel>) => {
          this.emailUserAttr.badgeLabel = badgeLabel;
        },
      );

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        this.#initEmailUserAttr();
        this.#initEditModal();
        this.#initDeleteModal();

        this.#onValueUpdate(getEmail(this.state));
        this.#onBadgeLabelUpdate(getEmailBadgeLabel(this.state));

        this.subscribe(this.#onValueUpdate.bind(this), getEmail);
        this.subscribe(this.#onBadgeLabelUpdate.bind(this), getEmailBadgeLabel);
      }
    },
);
