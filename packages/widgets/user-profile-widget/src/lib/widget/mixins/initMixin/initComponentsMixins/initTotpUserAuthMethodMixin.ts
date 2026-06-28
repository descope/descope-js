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
import { getHasTotp } from '../../../state/selectors';
import { flowSyncThemeMixin } from '../../flowSyncThemeMixin';

export const initTotpUserAuthMethodMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class TotpUserAuthMethodMixinClass extends compose(
      localeMixin,
      flowSyncThemeMixin,
      stateManagementMixin,
      loggerMixin,
      initWidgetRootMixin,
      cookieConfigMixin,
      modalMixin,
      flowInputMixin,
    )(superclass) {
      totpUserAuthMethod: UserAuthMethodDriver;

      #addModal: ModalDriver;

      #addFlow: FlowDriver;

      #removeTotpModal: ModalDriver;

      #removeTotpFlow: FlowDriver;

      #initAddModal() {
        if (!this.totpUserAuthMethod.flowId) return;

        this.#addModal = this.createModal({
          'data-id': 'totp',
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
          this.createFlowTemplate({ flowId: this.totpUserAuthMethod.flowId }),
        );
        this.#addFlow.onSuccess(() => {
          this.#addModal.close();
          this.actions.getMe();
        });
      }

      #initRemoveTotpModal() {
        if (!this.totpUserAuthMethod.fulfilledFlowId) return;

        this.#removeTotpModal = this.createModal({
          'data-id': 'remove-totp',
          'close-on-outside-click': 'true',
        });
        this.#removeTotpFlow = new FlowDriver(
          () => this.#removeTotpModal.ele?.querySelector('descope-wc'),
          { logger: this.logger },
        );
        this.#removeTotpModal.afterClose =
          this.#initRemoveTotpModalContent.bind(this);
        this.#initRemoveTotpModalContent();
        this.syncFlowTheme(this.#removeTotpFlow);
      }

      #initRemoveTotpModalContent() {
        this.#removeTotpModal.setContent(
          this.createFlowTemplate({
            flowId: this.totpUserAuthMethod.fulfilledFlowId,
          }),
        );
        this.#removeTotpFlow.onSuccess(() => {
          this.#removeTotpModal.close();
          this.actions.getMe();
        });
      }

      #initTotpAuthMethod() {
        this.totpUserAuthMethod = new UserAuthMethodDriver(
          () =>
            this.shadowRoot?.querySelector(
              'descope-user-auth-method[data-id="totp"]',
            ),
          { logger: this.logger },
        );

        this.totpUserAuthMethod.onUnfulfilledButtonClick(() => {
          this.#addModal?.open();
        });

        this.totpUserAuthMethod.onFulfilledButtonClick(() => {
          this.#removeTotpModal?.open();
        });
      }

      #onFulfilledUpdate = withMemCache(
        (hasTotp: ReturnType<typeof getHasTotp>) => {
          this.totpUserAuthMethod.fulfilled = hasTotp;
        },
      );

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        this.#initTotpAuthMethod();
        this.#initAddModal();
        this.#initRemoveTotpModal();

        this.#onFulfilledUpdate(getHasTotp(this.state));

        this.subscribe(this.#onFulfilledUpdate.bind(this), getHasTotp);
      }
    },
);
