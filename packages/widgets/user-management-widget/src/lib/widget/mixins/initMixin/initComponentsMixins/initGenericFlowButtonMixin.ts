import {
  GenericFlowButtonDriver,
  FlowDriver,
  ModalDriver,
} from '@descope/sdk-component-drivers';
import {
  compose,
  createSingletonMixin,
  withMemCache,
} from '@descope/sdk-helpers';
import { formMixin, loggerMixin, modalMixin } from '@descope/sdk-mixins';
import { flowSyncThemeMixin } from '../../flowSyncThemeMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';
import { stateManagementMixin } from '../../stateManagementMixin';
import { createFlowTemplate } from '../../../../helpers';
import {
  getEnableOneOrMore,
  getEnableOnlyOne,
  getSelectedUsersMap,
  getSelectedUsersUserIds,
} from '../../../state/selectors';

export const initGenericFlowButtonMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class InitGenericFlowButtonMixinClass extends compose(
      flowSyncThemeMixin,
      stateManagementMixin,
      modalMixin,
      loggerMixin,
      formMixin,
      initWidgetRootMixin,
    )(superclass) {
      #modal: ModalDriver;
      #flow: FlowDriver;
      #flowButtons: GenericFlowButtonDriver[] = [];

      #initComponents(ele: Element) {
        const button = new GenericFlowButtonDriver(ele, {
          logger: this.logger,
        });
        button.disable();
        button.onClick(() => {
          this.#initModalContent(button.flowId, button.enableMode);
          // wait here for the flow to be ready
          this.#modal.open();
        });
        this.#onIsUserSelectedUpdate(
          button,
          getEnableOneOrMore(this.state),
          getEnableOnlyOne(this.state),
        );
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
        this.#flow = new FlowDriver(
          () => this.#modal.ele?.querySelector('descope-wc'),
          { logger: this.logger },
        );
        this.syncFlowTheme(this.#flow);
      }

      #initModalContent(
        flowId: string,
        enableMode: 'oneOrMore' | 'onlyOne' | 'always',
      ) {
        this.#modal.setContent(
          createFlowTemplate({
            projectId: this.projectId,
            flowId,
            baseUrl: this.baseUrl,
            baseStaticUrl: this.baseStaticUrl,
            baseCdnUrl: this.baseCdnUrl,
            refreshCookieName: this.refreshCookieName,
            theme: this.theme,
            enableMode,
            client: JSON.stringify({
              userIds: getSelectedUsersUserIds(this.state),
              loginIds: getSelectedUsersMap(this.state),
            }),
          }),
        );
        this.#flow.onSuccess(() => {
          this.#modal.close();
        });
      }

      #onIsUserSelectedUpdate = withMemCache(
        (
          button: GenericFlowButtonDriver,
          isEnableOneOrMore: ReturnType<typeof getEnableOneOrMore>,
          isEnableOnlyOne: ReturnType<typeof getEnableOnlyOne>,
        ) => {
          switch (button.enableMode) {
            case 'oneOrMore':
              if (isEnableOneOrMore) {
                button.enable();
              } else {
                button.disable();
              }
              break;
            case 'onlyOne':
              if (isEnableOnlyOne) {
                button.enable();
              } else {
                button.disable();
              }
              break;
            case 'always':
              button.enable();
              break;
            default:
              button.disable();
              break;
          }
        },
      );

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        this.#initModal();
        this.#initFlowButtons();
        this.#flowButtons.forEach((button) => {
          this.subscribe(
            () =>
              this.#onIsUserSelectedUpdate(
                button,
                getEnableOneOrMore(this.state),
                getEnableOnlyOne(this.state),
              ),
            (state) => [getEnableOneOrMore(state), getEnableOnlyOne(state)],
          );
        });
      }
    },
);
