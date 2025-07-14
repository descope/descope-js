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
import { getAppsList } from '../../../state/selectors';
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
      obAppsList: OutboundAppsListDriver;

      #connectModal: ModalDriver;

      #connectFlow: FlowDriver;

      #initConnectModal() {
        if (!this.obAppsList.connectFlowId) return;

        this.#connectModal = this.createModal({
          'data-id': 'outbound-apps-connect',
        });

        this.#connectFlow = new FlowDriver(
          () => this.#connectModal.ele?.querySelector('descope-wc'),
          { logger: this.logger },
        );

        this.#connectModal.afterClose =
          this.#initConnectModalContent.bind(this);

        this.#initConnectModalContent();
        this.syncFlowTheme(this.#connectFlow);
      }

      #initConnectModalContent() {
        this.#connectModal.setContent(
          createFlowTemplate({
            projectId: this.projectId,
            flowId: this.obAppsList.connectFlowId,
            baseUrl: this.baseUrl,
            baseStaticUrl: this.baseStaticUrl,
            baseCdnUrl: this.baseCdnUrl,
            refreshCookieName: this.refreshCookieName,
            theme: this.theme,
          }),
        );
        this.#connectFlow.onSuccess(() => {
          this.#connectModal.close();
          // TODO: Update data
        });
      }

      #initAppsList(appsList: ReturnType<typeof getAppsList>) {
        this.obAppsList = new OutboundAppsListDriver(
          () => this.shadowRoot?.querySelector('descope-outbound-apps'),
          { logger: this.logger },
        );

        this.obAppsList.onConnectClick(() => {
          this.#connectModal?.open();
        });

        // console.log(this.#customAppsIds);
        this.obAppsList.data = this.filterAllowedApps(appsList);
      }

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        this.#initAppsList(getAppsList(this.state));
        this.#initConnectModal();
      }
    },
);
