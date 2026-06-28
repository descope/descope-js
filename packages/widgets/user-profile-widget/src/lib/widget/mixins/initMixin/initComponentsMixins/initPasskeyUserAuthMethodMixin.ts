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
  localeMixin,
  cookieConfigMixin,
  loggerMixin,
  modalMixin,
  flowInputMixin,
} from '@descope/sdk-mixins';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';
import { getHasPasskey } from '../../../state/selectors';
import { flowSyncThemeMixin } from '../../flowSyncThemeMixin';

export const initPasskeyUserAuthMethodMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class PasskeyUserAuthMethodMixinClass extends compose(
      localeMixin,
      flowSyncThemeMixin,
      stateManagementMixin,
      loggerMixin,
      initWidgetRootMixin,
      cookieConfigMixin,
      modalMixin,
      flowInputMixin,
    )(superclass) {
      passkeyUserAuthMethod: UserAuthMethodDriver;

      #addModal: ModalDriver;

      #addFlow: FlowDriver;

      #removeModal: ModalDriver;

      #removeFlow: FlowDriver;

      #initAddModal() {
        if (!this.passkeyUserAuthMethod.flowId) return;

        this.#addModal = this.createModal({
          'data-id': 'add-passkey',
          'close-on-outside-click': 'true',
        });
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
          this.createFlowTemplate({
            flowId: this.passkeyUserAuthMethod.flowId,
          }),
        );
        this.#addFlow.onSuccess(() => {
          this.#addModal.close();
          this.actions.getMe();
        });
      }

      #initRemoveModal() {
        if (!this.passkeyUserAuthMethod.fulfilledFlowId) return;

        this.#removeModal = this.createModal({
          'data-id': 'remove-passkey',
          'close-on-outside-click': 'true',
        });
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
          this.createFlowTemplate({
            flowId: this.passkeyUserAuthMethod.fulfilledFlowId,
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
