import {
  GenericFlowButtonDriver,
  FlowDriver,
  ModalDriver,
} from '@descope/sdk-component-drivers';
import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import { localeMixin, loggerMixin, modalMixin } from '@descope/sdk-mixins';
import { flowSyncThemeMixin } from '../../flowSyncThemeMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';
import { stateManagementMixin } from '../../stateManagementMixin';
import { flowInputMixin } from '../../flowInputMixin';
import { getUserId } from '../../../state/selectors';

export const initGenericFlowButtonMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class InitGenericFlowButtonMixinClass extends compose(
      localeMixin,
      flowSyncThemeMixin,
      stateManagementMixin,
      modalMixin,
      loggerMixin,
      initWidgetRootMixin,
      flowInputMixin,
    )(superclass) {
      #modal: ModalDriver;

      #flow: FlowDriver;

      #flowButtons: GenericFlowButtonDriver[] = [];

      #removePageUpdatedCallback: (() => void) | null = null;

      #initComponents(ele: Element) {
        const button = new GenericFlowButtonDriver(ele, {
          logger: this.logger,
        });
        button.onClick(() => {
          this.#initModalContent(button.flowId, getUserId(this.state));
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

      #initModal() {
        this.#modal = this.createModal({ 'data-id': 'generic-flow-modal' });
        this.#modal.afterClose = () => {
          this.#removePageUpdatedCallback?.();
          this.#removePageUpdatedCallback = null;
        };
        this.#flow = new FlowDriver(
          () => this.#modal.ele?.querySelector('descope-wc'),
          { logger: this.logger },
        );
        this.syncFlowTheme(this.#flow);
      }

      #onModalNeeded() {
        this.#modal.open();
        this.#removePageUpdatedCallback?.();
      }

      #initModalContent(flowId: string, userId: string) {
        this.#modal.setContent(
          this.buildFlowTemplate({ flowId, client: { userId } }),
        );
        const cb = () => this.#onModalNeeded();
        this.#removePageUpdatedCallback = this.#flow.onPageUpdated(cb);
        this.#flow.onSuccess(() => {
          this.#modal.close();
          this.actions.getMe();
        });
      }

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();
        this.#initModal();
        this.#initFlowButtons();
        this.#flowButtons.forEach((button) => button.enable());
      }
    },
);
