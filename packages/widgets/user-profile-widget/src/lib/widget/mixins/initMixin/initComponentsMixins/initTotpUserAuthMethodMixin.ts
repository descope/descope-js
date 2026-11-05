import { UserAuthMethodDriver } from '@descope/sdk-component-drivers';
import {
  compose,
  createSingletonMixin,
  withMemCache,
} from '@descope/sdk-helpers';
import { localeMixin, loggerMixin } from '@descope/sdk-mixins';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';
import { getHasTotp } from '../../../state/selectors';
import { flowRunnerMixin, FlowRunner } from '../../flowRunnerMixin';

export const initTotpUserAuthMethodMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class TotpUserAuthMethodMixinClass extends compose(
      localeMixin,
      stateManagementMixin,
      loggerMixin,
      initWidgetRootMixin,
      flowRunnerMixin,
    )(superclass) {
      totpUserAuthMethod: UserAuthMethodDriver;

      #addRunner: FlowRunner | undefined;

      #removeRunner: FlowRunner | undefined;

      #initTotpAuthMethod() {
        this.totpUserAuthMethod = new UserAuthMethodDriver(
          () =>
            this.shadowRoot?.querySelector(
              'descope-user-auth-method[data-id="totp"]',
            ),
          { logger: this.logger },
        );

        this.totpUserAuthMethod.onUnfulfilledButtonClick(() => {
          this.#addRunner?.open();
        });

        this.totpUserAuthMethod.onFulfilledButtonClick(() => {
          this.#removeRunner?.open();
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

        this.#addRunner = this.createFlowRunner({
          dataId: 'totp',
          flowId: this.totpUserAuthMethod.flowId,
          onSuccess: () => this.actions.getMe(),
        });

        this.#removeRunner = this.createFlowRunner({
          dataId: 'remove-totp',
          flowId: this.totpUserAuthMethod.fulfilledFlowId,
          onSuccess: () => this.actions.getMe(),
        });

        this.#onFulfilledUpdate(getHasTotp(this.state));

        this.subscribe(this.#onFulfilledUpdate.bind(this), getHasTotp);
      }
    },
);
