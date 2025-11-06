import {
  FlowDriver,
  ModalDriver,
  UserAuthMethodDriver,
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
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';
import { getHasPasskey } from '../../../state/selectors';
import { createFlowTemplate } from '../../helpers';
import { flowSyncThemeMixin } from '../../flowSyncThemeMixin';

export const initPasskeyUserAuthMethodMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class PasskeyUserAuthMethodMixinClass extends compose(
      flowSyncThemeMixin,
      stateManagementMixin,
      loggerMixin,
      initWidgetRootMixin,
      cookieConfigMixin,
      modalMixin,
    )(superclass) {
      passkeyUserAuthMethod: UserAuthMethodDriver;

      #addModal: ModalDriver;

      #addFlow: FlowDriver;

      #removeModal: ModalDriver;

      #removeFlow: FlowDriver;

      #initAddModal() {
        if (!this.passkeyUserAuthMethod.flowId) return;

        this.#addModal = this.createModal({ 'data-id': 'add-passkey' });
        this.#addFlow = new FlowDriver(
          () => this.#addModal.ele?.querySelector('descope-wc'),
          { logger: this.logger },
        );
        this.#addModal.afterClose = this.#initAddModalContent.bind(this);
        this.#initAddModalContent();
        this.syncFlowTheme(this.#addFlow);
      }

      #initAddModalContent() {
        this.#addModal.setContent(
          createFlowTemplate({
            projectId: this.projectId,
            flowId: this.passkeyUserAuthMethod.flowId,
            baseUrl: this.baseUrl,
            baseStaticUrl: this.baseStaticUrl,
            baseCdnUrl: this.baseCdnUrl,
            refreshCookieName: this.refreshCookieName,
            theme: this.theme,
            'style-id': this.styleId,
          }),
        );
        this.#addFlow.onSuccess(() => {
          this.#addModal.close();
          this.actions.getMe();
        });
      }

      #initRemoveModal() {
        if (!this.passkeyUserAuthMethod.fulfilledFlowId) return;

        this.#removeModal = this.createModal({ 'data-id': 'remove-passkey' });
        this.#removeFlow = new FlowDriver(
          () => this.#removeModal.ele?.querySelector('descope-wc'),
          { logger: this.logger },
        );
        this.#removeModal.afterClose = this.#initRemoveModalContent.bind(this);
        this.#initRemoveModalContent();
        this.syncFlowTheme(this.#removeFlow);
      }

      #initRemoveModalContent() {
        this.#removeModal.setContent(
          createFlowTemplate({
            projectId: this.projectId,
            flowId: this.passkeyUserAuthMethod.fulfilledFlowId,
            baseUrl: this.baseUrl,
            baseStaticUrl: this.baseStaticUrl,
            baseCdnUrl: this.baseCdnUrl,
            refreshCookieName: this.refreshCookieName,
            theme: this.theme,
            'style-id': this.styleId,
          }),
        );
        this.#removeFlow.onSuccess(() => {
          this.#removeModal.close();
          this.actions.getMe();
        });
      }

      #initPasskeyAuthMethod() {
        this.passkeyUserAuthMethod = new UserAuthMethodDriver(
          () =>
            this.shadowRoot?.querySelector(
              'descope-user-auth-method[data-id="passkey"]',
            ),
          { logger: this.logger },
        );

        this.passkeyUserAuthMethod.onUnfulfilledButtonClick(() => {
          this.#addModal?.open();
        });

        this.passkeyUserAuthMethod.onFulfilledButtonClick(() => {
          this.#removeModal?.open();
        });
      }

      #onFulfilledUpdate = withMemCache(
        (hasPasskey: ReturnType<typeof getHasPasskey>) => {
          this.passkeyUserAuthMethod.fulfilled = hasPasskey;
        },
      );

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        this.#initPasskeyAuthMethod();
        this.#initAddModal();
        this.#initRemoveModal();

        this.#onFulfilledUpdate(getHasPasskey(this.state));

        this.subscribe(this.#onFulfilledUpdate.bind(this), getHasPasskey);
      }
    },
);
