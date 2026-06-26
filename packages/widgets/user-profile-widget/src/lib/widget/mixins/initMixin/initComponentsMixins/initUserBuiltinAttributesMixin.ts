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
import { getUserBuiltinAttrs } from '../../../state/selectors';
import { flowSyncThemeMixin } from '../../flowSyncThemeMixin';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';

export const initUserBuiltinAttributesMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class UserBuiltinAttributesMixinClass extends compose(
      localeMixin,
      flowSyncThemeMixin,
      stateManagementMixin,
      loggerMixin,
      initWidgetRootMixin,
      cookieConfigMixin,
      modalMixin,
      flowInputMixin,
    )(superclass) {
      // field name (e.g. `givenName`) -> driver wrapping the matching descope-user-attribute
      #drivers: Record<string, UserAttributeDriver> = {};

      // flow Id is key in all maps
      #editModals: Record<string, ModalDriver> = {};

      #editFlows: Record<string, FlowDriver> = {};

      #deleteModals: Record<string, ModalDriver> = {};

      #deleteFlows: Record<string, FlowDriver> = {};

      #initEditModalContent(flowId: string) {
        this.#editModals[flowId]?.setContent(
          this.createFlowTemplate({ flowId }),
        );
        this.#editFlows[flowId]?.onSuccess(() => {
          this.#editModals[flowId]?.close();
          this.actions.getMe();
        });
      }

      // have 2 init functions for edit and delete modals in order to keep the same standards as the email/phone/name mixin
      #initDeleteModalContent(flowId: string) {
        this.#deleteModals[flowId]?.setContent(
          this.createFlowTemplate({ flowId }),
        );
        this.#deleteFlows[flowId]?.onSuccess(() => {
          this.#deleteModals[flowId]?.close();
          this.actions.getMe();
        });
      }

      #initEditFlow(
        nodeEle: Element,
        field: string,
        driver: UserAttributeDriver,
      ) {
        const editFlowId = nodeEle.getAttribute('edit-flow-id');
        if (!editFlowId) return;

        this.#editModals[editFlowId] = this.createModal({
          'data-id': `edit-${field}`,
        });

        this.#editFlows[editFlowId] = new FlowDriver(
          () => this.#editModals[editFlowId]?.ele?.querySelector('descope-wc'),
          { logger: this.logger },
        );
        this.#editModals[editFlowId].afterClose =
          this.#initEditModalContent.bind(this, editFlowId);

        driver.onEditClick(() => {
          this.#editModals?.[editFlowId]?.open();
        });

        this.#initEditModalContent(editFlowId);
        this.syncFlowTheme(this.#editFlows[editFlowId]);
      }

      #initDeleteFlow(
        nodeEle: Element,
        field: string,
        driver: UserAttributeDriver,
      ) {
        const deleteFlowId = nodeEle.getAttribute('delete-flow-id');
        if (!deleteFlowId) return;

        this.#deleteModals[deleteFlowId] = this.createModal({
          'data-id': `delete-${field}`,
        });

        this.#deleteFlows[deleteFlowId] = new FlowDriver(
          () =>
            this.#deleteModals[deleteFlowId]?.ele?.querySelector('descope-wc'),
          { logger: this.logger },
        );
        this.#deleteModals[deleteFlowId].afterClose =
          this.#initDeleteModalContent.bind(this, deleteFlowId);

        driver.onDeleteClick(() => {
          this.#deleteModals?.[deleteFlowId]?.open();
        });

        this.#initDeleteModalContent(deleteFlowId);
        this.syncFlowTheme(this.#deleteFlows[deleteFlowId]);
      }

      #initBuiltinUserAttrs() {
        const allBuiltinAttributesComponents =
          this.shadowRoot?.querySelectorAll(
            'descope-user-attribute[data-id^="builtin."]',
          );

        Array.from(allBuiltinAttributesComponents || []).forEach((nodeEle) => {
          const field = nodeEle.getAttribute('data-id').replace('builtin.', '');

          const driver = new UserAttributeDriver(nodeEle, {
            logger: this.logger,
          });
          this.#drivers[field] = driver;

          this.#initEditFlow(nodeEle, field, driver);
          this.#initDeleteFlow(nodeEle, field, driver);
        });
      }

      #onValueUpdate = withMemCache(
        (userBuiltinAttributes: ReturnType<typeof getUserBuiltinAttrs>) => {
          Object.keys(this.#drivers).forEach((field) => {
            this.#drivers[field].value = (
              userBuiltinAttributes[field] || ''
            ).toString();
          });
        },
      );

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        this.#initBuiltinUserAttrs();

        this.#onValueUpdate(getUserBuiltinAttrs(this.state));

        this.subscribe(this.#onValueUpdate.bind(this), getUserBuiltinAttrs);
      }
    },
);
