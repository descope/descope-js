import { GenericFlowButtonDriver } from '@descope/sdk-component-drivers';
import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import { localeMixin, loggerMixin } from '@descope/sdk-mixins';
import { initWidgetRootMixin } from './initWidgetRootMixin';
import { stateManagementMixin } from '../../stateManagementMixin';
import { getUserId } from '../../../state/selectors';
import { flowRunnerMixin, FlowRunner } from '../../flowRunnerMixin';

export const initGenericFlowButtonMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class InitGenericFlowButtonMixinClass extends compose(
      localeMixin,
      stateManagementMixin,
      loggerMixin,
      initWidgetRootMixin,
      flowRunnerMixin,
    )(superclass) {
      #flowButtons: GenericFlowButtonDriver[] = [];

      // One runner for every button, because they all share a single modal.
      // Which flow runs is decided per click, not here.
      #runner: FlowRunner | undefined;

      #initComponents(ele: Element) {
        const button = new GenericFlowButtonDriver(ele, {
          logger: this.logger,
        });
        button.onClick(() => {
          this.#runner?.open({
            flowId: button.flowId,
            client: { userId: getUserId(this.state) },
          });
        });
        this.#flowButtons.push(button);
      }

      #initFlowButtons() {
        const eles = this.shadowRoot?.querySelectorAll(
          '[data-generic-flow-button-id]',
        );
        Array.from(eles).forEach((ele) => {
          this.#initComponents(ele);
        });
      }

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        this.#initFlowButtons();

        this.#runner = this.createFlowRunner({
          dataId: 'generic-flow-modal',
          // only decides whether there is anything to run at all - every open
          // names the flow its own button wants
          flowId: this.#flowButtons[0]?.flowId,
          // built on click, and shown only once the flow renders a page, so a
          // flow that redirects away never flashes an empty modal
          presetContent: false,
          deferOpenUntilFirstPage: true,
          onSuccess: () => this.actions.getMe(),
        });

        this.#flowButtons.forEach((button) => button.enable());
      }
    },
);
