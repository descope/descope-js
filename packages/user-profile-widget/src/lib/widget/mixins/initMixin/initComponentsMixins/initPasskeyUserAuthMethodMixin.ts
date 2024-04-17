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
import { loggerMixin, modalMixin } from '@descope/sdk-mixins';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';
import { getHasPasskey } from '../../../state/selectors';
import { createFlowTemplate } from '../../helpers';

export const initPasskeyUserAuthMethodMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class PasskeyUserAuthMethodMixinClass extends compose(
      stateManagementMixin,
      loggerMixin,
      initWidgetRootMixin,
      modalMixin,
    )(superclass) {
      passkeyUserAuthMethod: UserAuthMethodDriver;

      #modal: ModalDriver;

      #flow: FlowDriver;

      #initModal() {
        this.#modal = this.createModal({ 'data-id': 'passkey' });
        this.#flow = new FlowDriver(
          () => this.#modal.ele?.querySelector('descope-wc'),
          { logger: this.logger },
        );
        this.#modal.afterClose = this.#initModalContent.bind(this);
        this.#initModalContent();
      }

      #initModalContent() {
        this.#modal.setContent(
          createFlowTemplate({
            projectId: this.projectId,
            flowId: 'test-widget',
            baseUrl: this.baseUrl,
          }),
        );
        this.#flow.onSuccess(() => {
          this.#modal.close();
          this.actions.getMe();
        });
      }

      #initPhoneUserAttr() {
        this.passkeyUserAuthMethod = new UserAuthMethodDriver(
          () =>
            this.shadowRoot?.querySelector(
              'descope-user-auth-method[data-id="passkey"]',
            ),
          { logger: this.logger },
        );

        this.passkeyUserAuthMethod.onButtonClick(() => {
          this.#modal.open();
        });
      }

      #onFulfilledUpdate = withMemCache(
        (hasPasskey: ReturnType<typeof getHasPasskey>) => {
          this.passkeyUserAuthMethod.fulfilled = hasPasskey;
        },
      );

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        this.#initPhoneUserAttr();
        this.#initModal();

        this.#onFulfilledUpdate(getHasPasskey(this.state));

        this.subscribe(this.#onFulfilledUpdate.bind(this), getHasPasskey);
      }
    },
);
