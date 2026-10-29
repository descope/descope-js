import { UserAuthMethodDriver } from '@descope/sdk-component-drivers';
import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import { localeMixin, loggerMixin } from '@descope/sdk-mixins';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';
import { flowRunnerMixin, FlowRunner } from '../../flowRunnerMixin';

export const initPasswordUserAuthMethodMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class PasswordUserAuthMethodMixinClass extends compose(
      localeMixin,
      stateManagementMixin,
      loggerMixin,
      initWidgetRootMixin,
      flowRunnerMixin,
    )(superclass) {
      passwordUserAuthMethod: UserAuthMethodDriver;

      #runner: FlowRunner | undefined;

      initPasswordAuthMethod() {
        this.passwordUserAuthMethod = new UserAuthMethodDriver(
          () =>
            this.shadowRoot?.querySelector(
              'descope-user-auth-method[data-id="password"]',
            ),
          { logger: this.logger },
        );

        this.passwordUserAuthMethod.onUnfulfilledButtonClick(() => {
          this.#runner?.open();
        });
      }

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        this.initPasswordAuthMethod();

        this.#runner = this.createFlowRunner({
          dataId: 'password',
          flowId: this.passwordUserAuthMethod.flowId,
        });
      }
    },
);
