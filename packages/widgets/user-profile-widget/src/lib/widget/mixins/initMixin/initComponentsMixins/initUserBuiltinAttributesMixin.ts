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
import { getUserBuiltinAttrs } from '../../../state/selectors';
import { flowSyncThemeMixin } from '../../flowSyncThemeMixin';
import { createFlowTemplate } from '../../helpers';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';

export const initUserBuiltinAttributesMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class UserBuiltinAttributesMixinClass extends compose(
      flowSyncThemeMixin,
      stateManagementMixin,
      loggerMixin,
      initWidgetRootMixin,
      cookieConfigMixin,
      modalMixin,
    )(superclass) {
      // flow Id is key in all maps
      #editModals: Record<string, ModalDriver> = {};

      #editFlows: Record<string, FlowDriver> = {};

      #deleteModals: Record<string, ModalDriver> = {};

      #deleteFlows: Record<string, FlowDriver> = {};

      #initEditModalContent(flowId: string) {
        this.#editModals[flowId]?.setContent(
          createFlowTemplate({
            projectId: this.projectId,
            flowId,
            baseUrl: this.baseUrl,
            baseStaticUrl: this.baseStaticUrl,
            baseCdnUrl: this.baseCdnUrl,
            refreshCookieName: this.refreshCookieName,
            theme: this.theme,
            'style-id': this.styleId,
          }),
        );
        this.#editFlows[flowId]?.onSuccess(() => {
          this.#editModals[flowId]?.close();
          this.actions.getMe();
        });
      }

      // have 2 init functions for edit and delete modals in order to keep the same standards as the email/phone/name mixin
      #initDeleteModalContent(flowId: string) {
        this.#deleteModals[flowId]?.setContent(
          createFlowTemplate({
            projectId: this.projectId,
            flowId,
            baseUrl: this.baseUrl,
            baseStaticUrl: this.baseStaticUrl,
            baseCdnUrl: this.baseCdnUrl,
            refreshCookieName: this.refreshCookieName,
            theme: this.theme,
            'style-id': this.styleId,
          }),
        );
        this.#deleteFlows[flowId]?.onSuccess(() => {
          this.#deleteModals[flowId]?.close();
          this.actions.getMe();
        });
      }

      #updateBuiltinValueUserAttrs = withMemCache(
        (userBuiltinAttributes: ReturnType<typeof getUserBuiltinAttrs>) => {
          const allBuiltinAttributesComponents =
            this.shadowRoot?.querySelectorAll(
              'descope-user-attribute[data-id^="builtin."]',
            );

          Array.from(allBuiltinAttributesComponents).forEach((nodeEle) => {
            const field = nodeEle
              .getAttribute('data-id')
              .replace('builtin.', '');
            const val = userBuiltinAttributes[field];

            const compInstance = new UserAttributeDriver(nodeEle, {
              logger: this.logger,
            });

            compInstance.value = (val || '').toString();

            this.#initEditFlow(nodeEle, field, compInstance);
            this.#initDeleteFlow(nodeEle, field, compInstance);
          });
        },
      );

      #initEditFlow(
        nodeEle: Element,
        field: string,
        compInstance: UserAttributeDriver,
      ) {
        const editFlowId = nodeEle.getAttribute('edit-flow-id');
        if (editFlowId) {
          this.#editModals[editFlowId] = this.createModal({
            'data-id': `edit-${field}`,
          });

          this.#editFlows[editFlowId] = new FlowDriver(
            () =>
              this.#editModals[editFlowId]?.ele?.querySelector('descope-wc'),
            { logger: this.logger },
          );
          this.#editModals[editFlowId].afterClose =
            this.#initEditModalContent.bind(this, editFlowId);

          compInstance.onEditClick(() => {
            this.#editModals?.[editFlowId]?.open();
          });

          this.#initEditModalContent(editFlowId);
          this.syncFlowTheme(this.#editFlows[editFlowId]);
        }
      }

      #initDeleteFlow(
        nodeEle: Element,
        field: string,
        compInstance: UserAttributeDriver,
      ) {
        const deleteFlowId = nodeEle.getAttribute('delete-flow-id');
        if (deleteFlowId) {
          this.#deleteModals[deleteFlowId] = this.createModal({
            'data-id': `delete-${field}`,
          });

          this.#deleteFlows[deleteFlowId] = new FlowDriver(
            () =>
              this.#deleteModals[deleteFlowId]?.ele?.querySelector(
                'descope-wc',
              ),
            { logger: this.logger },
          );
          this.#deleteModals[deleteFlowId].afterClose =
            this.#initDeleteModalContent.bind(this, deleteFlowId);

          compInstance.onDeleteClick(() => {
            this.#deleteModals?.[deleteFlowId]?.open();
          });

          this.#initDeleteModalContent(deleteFlowId);
          this.syncFlowTheme(this.#deleteFlows[deleteFlowId]);
        }
      }

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        this.#updateBuiltinValueUserAttrs(getUserBuiltinAttrs(this.state));

        this.subscribe(
          this.#updateBuiltinValueUserAttrs.bind(this),
          getUserBuiltinAttrs,
        );
      }
    },
);
