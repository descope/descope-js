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
  getSelectedUsersLoginIds,
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
      flowButton: GenericFlowButtonDriver;

      #initFlowButton() {
        this.flowButton = new GenericFlowButtonDriver(
          this.shadowRoot?.querySelector('[data-id="generic-flow-button"]'),
          { logger: this.logger },
        );
        this.flowButton.disable();
        this.flowButton.onClick(() => {
          this.#initModalContent();
          this.#modal.open();
        });
        this.#onIsUserSelectedUpdate(
          getEnableOneOrMore(this.state),
          getEnableOnlyOne(this.state),
        );
      }
      #initModal() {
        this.#modal = this.createModal({ 'data-id': 'generic-flow-modal' });
        this.#flow = new FlowDriver(
          () => this.#modal.ele?.querySelector('descope-wc'),
          { logger: this.logger },
        );
        this.#modal.afterClose = this.#initModalContent.bind(this);

        this.syncFlowTheme(this.#flow);
      }

      #initModalContent() {
        this.#modal.setContent(
          createFlowTemplate({
            projectId: this.projectId,
            flowId: this.flowButton.flowId,
            baseUrl: this.baseUrl,
            baseStaticUrl: this.baseStaticUrl,
            baseCdnUrl: this.baseCdnUrl,
            refreshCookieName: this.refreshCookieName,
            theme: this.theme,
            enableMode: this.flowButton.enableMode,
            form: JSON.stringify({
              users: getSelectedUsersLoginIds(this.state),
            }),
          }),
        );
        this.#flow.onSuccess(() => {
          this.#modal.close();
          // this.actions.getMe();
        });
      }

      #onIsUserSelectedUpdate = withMemCache(
        (
          isEnableOneOrMore: ReturnType<typeof getEnableOneOrMore>,
          isEnableOnlyOne: ReturnType<typeof getEnableOnlyOne>,
        ) => {
          switch (this.flowButton.enableMode) {
            case 'oneOrMore':
              if (isEnableOneOrMore) {
                this.flowButton.enable();
              } else {
                this.flowButton.disable();
              }
              break;
            case 'onlyOne':
              if (isEnableOnlyOne) {
                this.flowButton.enable();
              } else {
                this.flowButton.disable();
              }
              break;
            case 'always':
              this.flowButton.enable();
              break;
            default:
              this.flowButton.disable();
              break;
          }
        },
      );

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        this.#initModal();
        this.#initFlowButton();
        this.subscribe(
          () =>
            this.#onIsUserSelectedUpdate(
              getEnableOneOrMore(this.state),
              getEnableOnlyOne(this.state),
            ),
          (state) => [getEnableOneOrMore(state), getEnableOnlyOne(state)],
        );
      }
    },
);
