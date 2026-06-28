import { getAdditionalSSOIds } from './../state/selectors';
import { FlowDriver } from '@descope/sdk-component-drivers';
import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import {
  localeMixin,
  cookieConfigMixin,
  initLifecycleMixin,
  loggerMixin,
  modalMixin,
  themeMixin,
  flowInputMixin,
} from '@descope/sdk-mixins';
import { getUrlParam, resetUrlParam } from './helpers';
import { stateManagementMixin } from './stateManagementMixin';

const REDIRECT_FLOW_NAME_QUERY_PARAM = 'widget-flow';

export const flowRedirectUrlMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class FlowRedirectUrlMixinClass extends compose(
      localeMixin,
      initLifecycleMixin,
      modalMixin,
      stateManagementMixin,
      cookieConfigMixin,
      loggerMixin,
      themeMixin,
      flowInputMixin,
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
          this.createFlowTemplate({
            flowId: widgetFlow,
            tenant: this.tenantId,
          }),
        );

        const flow = new FlowDriver(
          () => modal.ele?.querySelector('descope-wc'),
          { logger: this.logger },
        );

        flow.onSuccess(async () => {
          modal.close();
          this.actions.getMe();
          await this.actions.getTenant();
          const ssoIds = getAdditionalSSOIds(this.state);
          await this.actions.getTenantAdminLinkSSO({ ssoIds });
        });

        modal.afterClose = () => {
          modal.remove();
        };

        modal.open();
      }
    },
);
