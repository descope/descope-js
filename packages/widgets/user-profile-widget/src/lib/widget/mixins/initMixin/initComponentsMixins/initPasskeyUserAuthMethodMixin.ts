import { UserAuthMethodDriver } from '@descope/sdk-component-drivers';
import {
  compose,
  createSingletonMixin,
  withMemCache,
} from '@descope/sdk-helpers';
import {
  localeMixin,
  cookieConfigMixin,
  loggerMixin,
} from '@descope/sdk-mixins';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';
import { getHasPasskey } from '../../../state/selectors';
import { flowRunnerMixin, FlowRunner } from '../../flowRunnerMixin';

export const initPasskeyUserAuthMethodMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class PasskeyUserAuthMethodMixinClass extends compose(
      localeMixin,
      stateManagementMixin,
      loggerMixin,
      initWidgetRootMixin,
      cookieConfigMixin,
      flowRunnerMixin,
    )(superclass) {
      passkeyUserAuthMethod: UserAuthMethodDriver;

      #addRunner: FlowRunner | undefined;

      #removeRunner: FlowRunner | undefined;

      #initPasskeyAuthMethod() {
        this.passkeyUserAuthMethod = new UserAuthMethodDriver(
          () =>
            this.shadowRoot?.querySelector(
              'descope-user-auth-method[data-id="passkey"]',
            ),
          { logger: this.logger },
        );

        this.passkeyUserAuthMethod.onUnfulfilledButtonClick(() => {
          this.#addRunner?.open();
        });

        this.passkeyUserAuthMethod.onFulfilledButtonClick(() => {
          this.#removeRunner?.open();
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

        this.#addRunner = this.createFlowRunner({
          dataId: 'add-passkey',
          flowId: this.passkeyUserAuthMethod.flowId,
          onSuccess: () => this.actions.getMe(),
        });

        this.#removeRunner = this.createFlowRunner({
          dataId: 'remove-passkey',
          flowId: this.passkeyUserAuthMethod.fulfilledFlowId,
          onSuccess: () => this.actions.getMe(),
        });

        this.#onFulfilledUpdate(getHasPasskey(this.state));

        this.subscribe(this.#onFulfilledUpdate.bind(this), getHasPasskey);
      }
    },
);
