import { UserAttributeDriver } from '@descope/sdk-component-drivers';
import {
  compose,
  createSingletonMixin,
  withMemCache,
} from '@descope/sdk-helpers';
import { localeMixin, loggerMixin } from '@descope/sdk-mixins';
import { getVerifiedRecoveryEmail } from '../../../state/selectors';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';
import { flowRunnerMixin, FlowRunner } from '../../flowRunnerMixin';

export const initRecoveryEmailUserAttrMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class RecoveryEmailUserAttrMixinClass extends compose(
      localeMixin,
      stateManagementMixin,
      loggerMixin,
      initWidgetRootMixin,
      flowRunnerMixin,
    )(superclass) {
      recoveryEmailUserAttr: UserAttributeDriver;

      #editRunner: FlowRunner | undefined;

      #deleteRunner: FlowRunner | undefined;

      #initRecoveryEmailUserAttr() {
        this.recoveryEmailUserAttr = new UserAttributeDriver(
          () =>
            this.shadowRoot?.querySelector(
              'descope-user-attribute[data-id="recoveryEmail"]',
            ),
          { logger: this.logger },
        );

        this.recoveryEmailUserAttr.onEditClick(() => {
          this.#editRunner?.open();
        });

        this.recoveryEmailUserAttr.onDeleteClick(() => {
          this.#deleteRunner?.open();
        });
      }

      // Value is gated on verified — an unverified/pending recovery email renders empty.
      #onValueUpdate = withMemCache(
        (recoveryEmail: ReturnType<typeof getVerifiedRecoveryEmail>) => {
          this.recoveryEmailUserAttr.value = recoveryEmail;
        },
      );

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        this.#initRecoveryEmailUserAttr();

        this.#editRunner = this.createFlowRunner({
          dataId: 'edit-recovery-email',
          flowId: this.recoveryEmailUserAttr.editFlowId,
          onSuccess: () => this.actions.getMe(),
        });

        this.#deleteRunner = this.createFlowRunner({
          dataId: 'delete-recovery-email',
          flowId: this.recoveryEmailUserAttr.deleteFlowId,
          onSuccess: () => this.actions.getMe(),
        });

        this.#onValueUpdate(getVerifiedRecoveryEmail(this.state));
        this.subscribe(
          this.#onValueUpdate.bind(this),
          getVerifiedRecoveryEmail,
        );
      }
    },
);
