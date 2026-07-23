import { FlowDriver } from '@descope/sdk-component-drivers';
import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import {
  localeMixin,
  initLifecycleMixin,
  loggerMixin,
  modalMixin,
  cookieConfigMixin,
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
        // this modal is auto-opened from a URL param and removes itself on close,
        // so it intentionally does not opt into close-on-outside-click - an
        // accidental tap should not discard the redirect flow
        const modal = this.createModal({ 'data-id': 'redirect-flow' });
        modal.setContent(this.createFlowTemplate({ flowId: widgetFlow }));

        const flow = new FlowDriver(
          () => modal.ele?.querySelector('descope-wc'),
          { logger: this.logger },
        );

        flow.onSuccess(() => {
          modal.close();
          this.actions.getMe();
        });

        modal.afterClose = () => {
          modal.remove();
        };

        modal.open();
      }
    },
);
