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
import { getUserCustomAttrs } from '../../../state/selectors';
import { createFlowTemplate } from '../../helpers';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';

export const initUserCustomAttributesMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class UserCustomAttributesMixinClass extends compose(
      stateManagementMixin,
      loggerMixin,
      initWidgetRootMixin,
      modalMixin,
    )(superclass) {
      customValueUserAttr: UserAttributeDriver;

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
          }),
        );
        this.#deleteFlows[flowId]?.onSuccess(() => {
          this.#deleteModals[flowId]?.close();
          this.actions.getMe();
        });
      }

      #updateCustomValueUserAttrs = withMemCache(
        (customAttr: ReturnType<typeof getUserCustomAttrs>) => {
          const allCustomAttributesComponents =
            this.shadowRoot?.querySelectorAll(
              'descope-user-attribute[data-id^="customAttributes."]',
            );

          Array.from(allCustomAttributesComponents).forEach((nodeEle) => {
            const attrName = nodeEle.getAttribute('data-id');
            const customAttrName = attrName.replace('customAttributes.', '');

            const compInstance = new UserAttributeDriver(nodeEle, {
              logger: this.logger,
            });

            compInstance.value = customAttr[customAttrName] || '';

            const editFlowId = nodeEle.getAttribute('edit-flow-id');
            if (editFlowId) {
              this.#editModals[editFlowId] = this.createModal({
                'data-id': `edit-${customAttrName}`,
              });

              this.#editFlows[editFlowId] = new FlowDriver(
                () =>
                  this.#editModals[editFlowId]?.ele?.querySelector(
                    'descope-wc',
                  ),
                { logger: this.logger },
              );
              this.#editModals[editFlowId].afterClose =
                this.#initEditModalContent.bind(this, editFlowId);

              compInstance.onEditClick(() => {
                this.#editModals?.[editFlowId]?.open();
              });

              this.#initEditModalContent(editFlowId);
            }

            const deleteFlowId = nodeEle.getAttribute('delete-flow-id');
            if (deleteFlowId) {
              this.#deleteModals[deleteFlowId] = this.createModal({
                'data-id': `delete-${customAttrName}`,
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
            }
          });
        },
      );

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        this.#updateCustomValueUserAttrs(getUserCustomAttrs(this.state));

        this.subscribe(
          this.#updateCustomValueUserAttrs.bind(this),
          getUserCustomAttrs,
        );
      }
    },
);
