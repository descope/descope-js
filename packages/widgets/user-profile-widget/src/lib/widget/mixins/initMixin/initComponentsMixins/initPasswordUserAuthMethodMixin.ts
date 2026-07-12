import {
  FlowDriver,
  ModalDriver,
  UserAuthMethodDriver,
} from '@descope/sdk-component-drivers';
import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import {
  localeMixin,
  cookieConfigMixin,
  loggerMixin,
  modalMixin,
  flowInputMixin,
} from '@descope/sdk-mixins';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';
import { flowSyncThemeMixin } from '../../flowSyncThemeMixin';

export const initPasswordUserAuthMethodMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class PasswordUserAuthMethodMixinClass extends compose(
      localeMixin,
      flowSyncThemeMixin,
      stateManagementMixin,
      loggerMixin,
      initWidgetRootMixin,
      cookieConfigMixin,
      modalMixin,
      flowInputMixin,
    )(superclass) {
      passwordUserAuthMethod: UserAuthMethodDriver;

      #modal: ModalDriver;

      #flow: FlowDriver;

      #initModal() {
        if (!this.passwordUserAuthMethod.flowId) return;

        this.#modal = this.createModal({
          'data-id': 'password',
          'close-on-outside-click': 'true',
        });
        this.#flow = new FlowDriver(
          () => this.#modal.ele?.querySelector('descope-wc'),
          { logger: this.logger },
        );
        this.#modal.afterClose = this.#initModalContent.bind(this);
        this.#initModalContent();
        this.syncFlowTheme(this.#flow);
      }

      #initModalContent() {
        this.#modal.setContent(
          this.createFlowTemplate({
            flowId: this.passwordUserAuthMethod.flowId,
          }),
        );
        this.#flow.onSuccess(() => {
          this.#modal.close();
        });
      }

      initPasswordAuthMethod() {
        this.passwordUserAuthMethod = new UserAuthMethodDriver(
          () =>
            this.shadowRoot?.querySelector(
              'descope-user-auth-method[data-id="password"]',
            ),
          { logger: this.logger },
        );

        this.passwordUserAuthMethod.onUnfulfilledButtonClick(() => {
          this.#modal?.open();
        });
      }

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        this.initPasswordAuthMethod();
        this.#initModal();
      }
    },
);
