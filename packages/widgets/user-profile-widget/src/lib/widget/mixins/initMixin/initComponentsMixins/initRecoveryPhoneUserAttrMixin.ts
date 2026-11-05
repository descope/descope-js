import { UserAttributeDriver } from '@descope/sdk-component-drivers';
import {
  compose,
  createSingletonMixin,
  withMemCache,
} from '@descope/sdk-helpers';
import { localeMixin, loggerMixin } from '@descope/sdk-mixins';
import { getVerifiedRecoveryPhone } from '../../../state/selectors';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';
import { flowRunnerMixin, FlowRunner } from '../../flowRunnerMixin';

export const initRecoveryPhoneUserAttrMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class RecoveryPhoneUserAttrMixinClass extends compose(
      localeMixin,
      stateManagementMixin,
      loggerMixin,
      initWidgetRootMixin,
      flowRunnerMixin,
    )(superclass) {
      recoveryPhoneUserAttr: UserAttributeDriver;

      #editRunner: FlowRunner | undefined;

      #deleteRunner: FlowRunner | undefined;

      #initRecoveryPhoneUserAttr() {
        this.recoveryPhoneUserAttr = new UserAttributeDriver(
          () =>
            this.shadowRoot?.querySelector(
              'descope-user-attribute[data-id="recoveryPhone"]',
            ),
          { logger: this.logger },
        );

        this.recoveryPhoneUserAttr.onEditClick(() => {
          this.#editRunner?.open();
        });

        this.recoveryPhoneUserAttr.onDeleteClick(() => {
          this.#deleteRunner?.open();
        });
      }

      // Value is gated on verified — an unverified/pending recovery phone renders empty.
      #onValueUpdate = withMemCache(
        (recoveryPhone: ReturnType<typeof getVerifiedRecoveryPhone>) => {
          this.recoveryPhoneUserAttr.value = recoveryPhone;
        },
      );

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        this.#initRecoveryPhoneUserAttr();

        this.#editRunner = this.createFlowRunner({
          dataId: 'edit-recovery-phone',
          flowId: this.recoveryPhoneUserAttr.editFlowId,
          onSuccess: () => this.actions.getMe(),
        });

        this.#deleteRunner = this.createFlowRunner({
          dataId: 'delete-recovery-phone',
          flowId: this.recoveryPhoneUserAttr.deleteFlowId,
          onSuccess: () => this.actions.getMe(),
        });

        this.#onValueUpdate(getVerifiedRecoveryPhone(this.state));
        this.subscribe(
          this.#onValueUpdate.bind(this),
          getVerifiedRecoveryPhone,
        );
      }
    },
);
