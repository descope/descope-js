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
  cookieConfigMixin,
  loggerMixin,
  modalMixin,
} from '@descope/sdk-mixins';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';
import { getHasPasskey } from '../../../state/selectors';
import { createFlowTemplate } from '../../helpers';
import { flowSyncThemeMixin } from '../../flowSyncThemeMixin';

export const initPasskeyUserAuthMethodMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class PasskeyUserAuthMethodMixinClass extends compose(
      flowSyncThemeMixin,
      stateManagementMixin,
      loggerMixin,
      initWidgetRootMixin,
      cookieConfigMixin,
      modalMixin,
    )(superclass) {
      passkeyUserAuthMethod: UserAuthMethodDriver;

      #modal: ModalDriver;

      #flow: FlowDriver;

      #initModal() {
        if (!this.passkeyUserAuthMethod.flowId) return;

        this.#modal = this.createModal({ 'data-id': 'passkey' });
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
          createFlowTemplate({
            projectId: this.projectId,
            flowId: this.passkeyUserAuthMethod.flowId,
            baseUrl: this.baseUrl,
            baseStaticUrl: this.baseStaticUrl,
            baseCdnUrl: this.baseCdnUrl,
            refreshCookieName: this.refreshCookieName,
            theme: this.theme,
          }),
        );
        this.#flow.onSuccess(() => {
          this.#modal.close();
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

        this.passkeyUserAuthMethod.onButtonClick(() => {
          this.#modal?.open();
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
        this.#initModal();

        this.#onFulfilledUpdate(getHasPasskey(this.state));

        this.subscribe(this.#onFulfilledUpdate.bind(this), getHasPasskey);
      }
    },
);
