import { UserPasskeysDriver } from '@descope/sdk-component-drivers';
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
import { getUserId, getUserPasskeys } from '../../../state/selectors';
import { flowRunnerMixin, FlowRunner } from '../../flowRunnerMixin';

export const initUserPasskeysMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class PasskeyUserAuthMethodMixinClass extends compose(
      localeMixin,
      stateManagementMixin,
      loggerMixin,
      initWidgetRootMixin,
      cookieConfigMixin,
      flowRunnerMixin,
    )(superclass) {
      userPasskeys: UserPasskeysDriver;

      #addRunner: FlowRunner | undefined;

      #removeRunner: FlowRunner | undefined;

      #refreshUser() {
        this.actions.getMe();
        this.actions.listPasskeys({ userId: getUserId(this.state) });
      }

      #fetchPasskeys = withMemCache((userId: string) => {
        this.actions.listPasskeys({ userId });
      });

      updatePasskeyList = withMemCache((data) => {
        this.userPasskeys.data = data;
      });

      #initUserPasskeys(passkeysList: ReturnType<typeof getUserPasskeys>) {
        this.updatePasskeyList(passkeysList);

        this.userPasskeys.onAddPasskeyClick(() => {
          this.#addRunner?.open();
        });

        this.userPasskeys.onRemovePasskeyClick(({ id: credentialId }) => {
          // the flow needs to know which credential to remove, so its content
          // cannot be built until the user picks one
          this.#removeRunner?.open({
            form: { externalId: getUserId(this.state), credentialId },
          });
        });
      }

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        this.userPasskeys = new UserPasskeysDriver(
          () => this.shadowRoot?.querySelector('descope-user-passkeys'),
          { logger: this.logger },
        );

        if (this.userPasskeys.isExists) {
          this.#initUserPasskeys(getUserPasskeys(this.state));

          this.#addRunner = this.createFlowRunner({
            dataId: 'add-user-passkey',
            flowId: this.userPasskeys.addPasskeyFlowId,
            onSuccess: () => this.#refreshUser(),
          });

          this.#removeRunner = this.createFlowRunner({
            dataId: 'remove-user-passkey',
            flowId: this.userPasskeys.removePasskeyFlowId,
            presetContent: false,
            onSuccess: () => this.#refreshUser(),
          });

          this.subscribe(this.#fetchPasskeys.bind(this), getUserId);
          this.subscribe(this.updatePasskeyList.bind(this), getUserPasskeys);
        }
      }
    },
);
