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
import { AttributeTypeName } from '../../../api/types';
import { getTenantCustomAttributes } from '../../../state/selectors';
import { flowSyncThemeMixin } from '../../flowSyncThemeMixin';
import { createFlowTemplate } from '../../helpers';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';

const getFormattedValue = (type: string, val: any) => {
  if (type === AttributeTypeName.DATE && val) {
    return new Date(val).toLocaleString();
  }
  if (type === AttributeTypeName.BOOLEAN && val !== undefined) {
    return !val ? 'False' : 'True';
  }
  return (val || '').toString();
};

export const initTenantCustomAttributesMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class TenantCustomAttributesMixinClass extends compose(
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

      #initEditModalContent(
        flowId: string,
        type: string,
        attName: string,
        value: any,
      ) {
        const customAttributeValue =
          type === AttributeTypeName.ARRAY ? (value || []).join(',') : value;

        this.#editModals[flowId]?.setContent(
          createFlowTemplate({
            projectId: this.projectId,
            flowId,
            tenant: this.tenantId,
            baseUrl: this.baseUrl,
            baseStaticUrl: this.baseStaticUrl,
            baseCdnUrl: this.baseCdnUrl,
            refreshCookieName: this.refreshCookieName,
            theme: this.theme,
            'style-id': this.styleId,
            form: JSON.stringify({
              customAttributes: {
                [attName]: customAttributeValue,
              },
            }),
          }),
        );
        this.#editFlows[flowId]?.onSuccess(() => {
          this.#editModals[flowId]?.close();
          this.actions.getTenant();
        });
      }

      // have 2 init functions for edit and delete modals in order to keep the same standards as the email/phone/name mixin
      #initDeleteModalContent(flowId: string) {
        this.#deleteModals[flowId]?.setContent(
          createFlowTemplate({
            projectId: this.projectId,
            flowId,
            tenant: this.tenantId,
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
          this.actions.getTenant();
        });
      }

      #updateCustomValueTenantAttrs = withMemCache(
        (
          tenantCustomAttributes: ReturnType<typeof getTenantCustomAttributes>,
        ) => {
          const allCustomAttributesComponents =
            this.shadowRoot?.querySelectorAll(
              'descope-user-attribute[data-id^="customAttributes."]',
            );

          Array.from(allCustomAttributesComponents).forEach((nodeEle) => {
            const attrName = nodeEle.getAttribute('data-id');
            const customAttrName = attrName.replace('customAttributes.', '');
            const type =
              nodeEle.getAttribute('data-type') || AttributeTypeName.TEXT;
            const val = tenantCustomAttributes[customAttrName];

            const compInstance = new UserAttributeDriver(nodeEle, {
              logger: this.logger,
            });

            compInstance.value = getFormattedValue(type, val);

            this.#initEditFlow(
              nodeEle,
              customAttrName,
              compInstance,
              type,
              customAttrName,
            );
            this.#initDeleteFlow(nodeEle, customAttrName, compInstance);
          });
        },
      );

      #initEditFlow(
        nodeEle: Element,
        customAttrName: string,
        compInstance: UserAttributeDriver,
        type: string,
        attName: string,
      ) {
        const editFlowId = nodeEle.getAttribute('edit-flow-id');
        if (editFlowId) {
          // Only create modal and flow if they don't exist yet
          if (!this.#editModals[editFlowId]) {
            this.#editModals[editFlowId] = this.createModal({
              'data-id': `edit-${customAttrName}`,
            });

            this.#editFlows[editFlowId] = new FlowDriver(
              () =>
                this.#editModals[editFlowId]?.ele?.querySelector('descope-wc'),
              { logger: this.logger },
            );
            this.#editModals[editFlowId].beforeOpen = () => {
              const currentVal = getTenantCustomAttributes(this.state)[attName];
              this.#initEditModalContent(editFlowId, type, attName, currentVal);
            };

            compInstance.onEditClick(() => {
              this.#editModals?.[editFlowId]?.open();
            });

            this.syncFlowTheme(this.#editFlows[editFlowId]);
          }
        }
      }

      #initDeleteFlow(
        nodeEle: Element,
        customAttrName: string,
        compInstance: UserAttributeDriver,
      ) {
        const deleteFlowId = nodeEle.getAttribute('delete-flow-id');
        if (deleteFlowId) {
          // Only create modal and flow if they don't exist yet
          if (!this.#deleteModals[deleteFlowId]) {
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
            this.#deleteModals[deleteFlowId].beforeOpen =
              this.#initDeleteModalContent.bind(this, deleteFlowId);

            compInstance.onDeleteClick(() => {
              this.#deleteModals?.[deleteFlowId]?.open();
            });

            this.syncFlowTheme(this.#deleteFlows[deleteFlowId]);
          }
        }
      }

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        this.#updateCustomValueTenantAttrs(
          getTenantCustomAttributes(this.state),
        );

        this.subscribe(
          this.#updateCustomValueTenantAttrs.bind(this),
          getTenantCustomAttributes,
        );
      }
    },
);
