import {
  OutboundAppsListDriver,
  ModalDriver,
  FlowDriver,
} from '@descope/sdk-component-drivers';
import {
  compose,
  createSingletonMixin,
  withMemCache,
} from '@descope/sdk-helpers';
import { loggerMixin, modalMixin } from '@descope/sdk-mixins';
import { getAppsList, getUserId } from '../../../state/selectors';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';
import { createFlowTemplate } from '../../helpers';
import { flowSyncThemeMixin } from '../../flowSyncThemeMixin';

export const initOutboundAppsListMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class InitAppsListMixinClass extends compose(
      flowSyncThemeMixin,
      stateManagementMixin,
      loggerMixin,
      initWidgetRootMixin,
      modalMixin,
    )(superclass) {
      #obAppsList: OutboundAppsListDriver;

      #connectModal: ModalDriver;

      #disconnectModal: ModalDriver;

      #connectFlow: FlowDriver;

      #disconnectFlow: FlowDriver;

      #connectModalCallback: (() => void) | null = null;

      #disconnectModalCallback: (() => void) | null = null;

      #initConnectModal() {
        if (!this.#obAppsList.connectFlowId) return;

        this.#connectModal = this.createModal({
          'data-id': 'outbound-apps-connect',
        });

        this.#connectModal.afterClose = () => {
          if (this.#connectModalCallback) {
            const sdk = this.#connectModal.ele?.querySelector('descope-wc');
            sdk?.removeEventListener(
              'page-updated',
              this.#connectModalCallback,
            );
            this.#connectModalCallback = null;
          }
        };

        this.#connectFlow = new FlowDriver(
          () => this.#connectModal.ele?.querySelector('descope-wc'),
          { logger: this.logger },
        );

        this.syncFlowTheme(this.#connectFlow);
      }

      // eslint-disable-next-line class-methods-use-this
      #onModalNeeded(modal: ModalDriver, sdk: any, callback: () => void) {
        modal.open();
        sdk.removeEventListener('page-updated', callback);
      }

      #openModalIfNeeded(modal: ModalDriver, cbRef: () => void | null) {
        const sdk = modal.ele?.querySelector('descope-wc');
        const cb = () => this.#onModalNeeded(modal, sdk, cb);
        // eslint-disable-next-line no-param-reassign
        cbRef = cb;
        sdk?.addEventListener('page-updated', cbRef);
      }

      #initDisconnectModal() {
        this.#disconnectModal = this.createModal({
          'data-id': 'outbound-apps-disconnect',
        });

        this.#disconnectFlow = new FlowDriver(
          () => this.#disconnectModal.ele?.querySelector('descope-wc'),
          { logger: this.logger },
        );

        this.#disconnectModal.afterClose = () => {
          if (this.#disconnectModalCallback) {
            const sdk = this.#disconnectModal.ele?.querySelector('descope-wc');
            sdk?.removeEventListener(
              'page-updated',
              this.#disconnectModalCallback,
            );
            this.#disconnectModalCallback = null;
          }
        };

        this.syncFlowTheme(this.#disconnectFlow);
      }

      #initConnectModalContent(appId: string) {
        this.#connectModal.setContent(
          createFlowTemplate({
            projectId: this.projectId,
            flowId: this.#obAppsList.connectFlowId,
            baseUrl: this.baseUrl,
            baseStaticUrl: this.baseStaticUrl,
            baseCdnUrl: this.baseCdnUrl,
            refreshCookieName: this.refreshCookieName,
            theme: this.theme,
            'style-id': this.styleId,
            outboundAppId: appId,
          }),
        );

        this.#openModalIfNeeded(this.#connectModal, this.#connectModalCallback);

        this.#connectFlow.onSuccess(() => {
          this.#connectModal.close();
          this.actions.getConnectedOutboundApps({
            userId: getUserId(this.state),
          });
        });
      }

      #initDisconnectModalContent(appId: string) {
        this.#disconnectModal.setContent(
          createFlowTemplate({
            projectId: this.projectId,
            flowId: this.#obAppsList.disconnectFlowId,
            baseUrl: this.baseUrl,
            baseStaticUrl: this.baseStaticUrl,
            baseCdnUrl: this.baseCdnUrl,
            refreshCookieName: this.refreshCookieName,
            theme: this.theme,
            'style-id': this.styleId,
            outboundAppId: appId,
          }),
        );

        this.#openModalIfNeeded(
          this.#disconnectModal,
          this.#disconnectModalCallback,
        );

        this.#disconnectFlow.onSuccess(() => {
          this.#disconnectModal.close();
          this.actions.getConnectedOutboundApps({
            userId: getUserId(this.state),
          });
        });
      }

      #initAppsList(appsList: ReturnType<typeof getAppsList>) {
        this.#obAppsList = new OutboundAppsListDriver(
          () => this.shadowRoot?.querySelector('descope-outbound-apps'),
          { logger: this.logger },
        );

        this.#obAppsList.onConnectClick(({ id }) => {
          this.#initConnectModalContent(id);
        });

        this.#obAppsList.onDisconnectClick(({ id }) => {
          this.#initDisconnectModalContent(id);
        });

        this.#obAppsList.data = appsList;
      }

      #onConnectedAppsUpdate = withMemCache((data) => {
        this.#obAppsList.data = data;
      });

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        this.#initAppsList(getAppsList(this.state));
        this.#initConnectModal();
        this.#initDisconnectModal();

        this.subscribe(this.#onConnectedAppsUpdate.bind(this), getAppsList);
      }
    },
);
