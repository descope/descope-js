import {
  FlowDriver,
  ModalDriver,
  UserPasskeysDriver,
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
import { getUserId, getUserPasskeys } from '../../../state/selectors';
import { createFlowTemplate } from '../../helpers';
import { flowSyncThemeMixin } from '../../flowSyncThemeMixin';

export const initUserPasskeysMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class PasskeyUserAuthMethodMixinClass extends compose(
      flowSyncThemeMixin,
      stateManagementMixin,
      loggerMixin,
      initWidgetRootMixin,
      cookieConfigMixin,
      modalMixin,
    )(superclass) {
      userPasskeys: UserPasskeysDriver;

      #addModal: ModalDriver;

      #addFlow: FlowDriver;

      #removeModal: ModalDriver;

      #removeFlow: FlowDriver;

      #initAddModal() {
        if (!this.userPasskeys.addPasskeyFlowId) return;

        this.#addModal = this.createModal({ 'data-id': 'add-user-passkey' });
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
          createFlowTemplate({
            projectId: this.projectId,
            flowId: this.userPasskeys.addPasskeyFlowId,
            baseUrl: this.baseUrl,
            baseStaticUrl: this.baseStaticUrl,
            baseCdnUrl: this.baseCdnUrl,
            refreshCookieName: this.refreshCookieName,
            theme: this.theme,
            'style-id': this.styleId,
          }),
        );
        this.#addFlow.onSuccess(() => {
          this.#addModal.close();
          this.actions.getMe();
          this.actions.listPasskeys({ userId: getUserId(this.state) });
        });
      }

      #initRemoveModal() {
        if (!this.userPasskeys.removePasskeyFlowId) return;

        this.#removeModal = this.createModal({
          'data-id': 'remove-user-passkey',
        });
        this.#removeFlow = new FlowDriver(
          () => this.#removeModal.ele?.querySelector('descope-wc'),
          { logger: this.logger },
        );
        this.syncFlowTheme(this.#removeFlow);
      }

      #initRemoveModalContent({ externalId, credentialId }) {
        this.#removeModal.setContent(
          createFlowTemplate({
            projectId: this.projectId,
            flowId: this.userPasskeys.removePasskeyFlowId,
            baseUrl: this.baseUrl,
            baseStaticUrl: this.baseStaticUrl,
            baseCdnUrl: this.baseCdnUrl,
            refreshCookieName: this.refreshCookieName,
            theme: this.theme,
            'style-id': this.styleId,
            form: { externalId, credentialId },
          }),
        );
        this.#removeFlow.onSuccess(() => {
          this.#removeModal.close();
          this.actions.getMe();
          this.actions.listPasskeys({ userId: getUserId(this.state) });
        });
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
          this.#addModal?.open();
        });

        this.userPasskeys.onRemovePasskeyClick(({ id: credentialId }) => {
          const externalId = getUserId(this.state);
          this.#initRemoveModalContent({ externalId, credentialId });
          this.#removeModal?.open();
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
          this.#initAddModal();
          this.#initRemoveModal();
          this.subscribe(this.#fetchPasskeys.bind(this), getUserId);
          this.subscribe(this.updatePasskeyList.bind(this), getUserPasskeys);
        }
      }
    },
);
