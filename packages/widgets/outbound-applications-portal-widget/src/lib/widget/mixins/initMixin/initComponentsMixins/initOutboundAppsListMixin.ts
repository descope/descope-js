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
import {
  getAppsList,
  getConnectedAppsList,
  getMappedAppsList,
  getUserId,
} from '../../../state/selectors';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';
import { createFlowTemplate } from '../../helpers';
import { flowSyncThemeMixin } from '../../flowSyncThemeMixin';
import { customAppsMixin } from '../customAppsMixin';

export const initOutboundAppsListMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class InitAppsListMixinClass extends compose(
      flowSyncThemeMixin,
      stateManagementMixin,
      loggerMixin,
      initWidgetRootMixin,
      modalMixin,
      customAppsMixin,
    )(superclass) {
      #obAppsList: OutboundAppsListDriver;

      #connectModal: ModalDriver;

      #disconnectModal: ModalDriver;

      #connectFlow: FlowDriver;

      #disconnectFlow: FlowDriver;

      #initConnectModal() {
        if (!this.#obAppsList.connectFlowId) return;

        this.#connectModal = this.createModal({
          'data-id': 'outbound-apps-connect',
        });

        this.#connectFlow = new FlowDriver(
          () => this.#connectModal.ele?.querySelector('descope-wc'),
          { logger: this.logger },
        );

        this.#connectModal.afterClose =
          this.#initConnectModalContent.bind(this);

        this.#initConnectModalContent('');
        this.syncFlowTheme(this.#connectFlow);
      }

      #initDisconnectModal() {
        this.#disconnectModal = this.createModal({
          'data-id': 'outbound-apps-disconnect',
        });

        this.#disconnectFlow = new FlowDriver(
          () => this.#disconnectModal.ele?.querySelector('descope-wc'),
          { logger: this.logger },
        );

        this.#disconnectModal.afterClose =
          this.#initDisconnectModalContent.bind(this);

        this.#initDisconnectModalContent('');
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
            form: `{ "outboundappid": "${appId}" }`,
          }),
        );
        this.#connectFlow.onSuccess(() => {
          this.#connectModal.close();
          // TODO: Update data
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
            outboundAppId: appId,
          }),
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
          this.#connectModal?.open();
        });

        this.#obAppsList.onDisconnectClick(({ id }) => {
          this.#initDisconnectModalContent(id);
          this.#disconnectModal?.open();
        });

        this.#obAppsList.data = this.filterAllowedApps(appsList);
      }

      #onConnectedAppsUpdate = withMemCache(
        (connectedAppsUpdate: ReturnType<typeof getConnectedAppsList>) => {
          // TODO: apply connectedAppsUpdate to allowed list
          this.#obAppsList.data = getMappedAppsList(this.state);
        },
      );

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        this.#initAppsList(getAppsList(this.state));
        this.#initConnectModal();
        this.#initDisconnectModal();

        this.subscribe(
          this.#onConnectedAppsUpdate.bind(this),
          getConnectedAppsList,
        );
      }
    },
);
