import { FlowDriver } from '@descope/sdk-component-drivers';
import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import {
  cookieConfigMixin,
  initLifecycleMixin,
  loggerMixin,
  modalMixin,
  themeMixin,
} from '@descope/sdk-mixins';
import { createFlowTemplate, getUrlParam, resetUrlParam } from './helpers';
import { stateManagementMixin } from './stateManagementMixin';

const REDIRECT_FLOW_NAME_QUERY_PARAM = 'widget-flow';

export const flowRedirectUrlMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class FlowRedirectUrlMixinClass extends compose(
      initLifecycleMixin,
      modalMixin,
      stateManagementMixin,
      cookieConfigMixin,
      loggerMixin,
      themeMixin,
    )(superclass) {
      async init() {
        await super.init?.();

        const widgetFlow = getUrlParam(REDIRECT_FLOW_NAME_QUERY_PARAM);

        if (widgetFlow) {
          resetUrlParam(REDIRECT_FLOW_NAME_QUERY_PARAM);
          this.#createFlowRedirectModal(widgetFlow);
        }
      }

      #createFlowRedirectModal(widgetFlow: string) {
        const modal = this.createModal({ 'data-id': 'redirect-flow' });
        modal.setContent(
          createFlowTemplate({
            projectId: this.projectId,
            flowId: widgetFlow,
            tenant: this.tenantId,
            baseUrl: this.baseUrl,
            baseStaticUrl: this.baseStaticUrl,
            baseCdnUrl: this.baseCdnUrl,
            refreshCookieName: this.refreshCookieName,
            theme: this.theme,
          }),
        );

        const flow = new FlowDriver(
          () => modal.ele?.querySelector('descope-wc'),
          { logger: this.logger },
        );

        flow.onSuccess(() => {
          modal.close();
          this.actions.getMe();
          this.actions.getTenant();
          this.actions.getTenantAdminLinkSSO();
        });

        modal.afterClose = () => {
          modal.remove();
        };

        modal.open();
      }
    },
);
