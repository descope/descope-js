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
import {
  localeMixin,
  formMixin,
  loggerMixin,
  modalMixin,
  flowInputMixin,
} from '@descope/sdk-mixins';
import { flowSyncThemeMixin } from '../../flowSyncThemeMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';
import { stateManagementMixin } from '../../stateManagementMixin';
import {
  getSelectedUsersAllIds,
  getSelectedUsersLoginIds,
  getSelectedUsersRolesList,
  getSelectedUsersUserIds,
} from '../../../state/selectors';

export const initGenericFlowButtonMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class InitGenericFlowButtonMixinClass extends compose(
      localeMixin,
      flowSyncThemeMixin,
      stateManagementMixin,
      modalMixin,
      loggerMixin,
      formMixin,
      initWidgetRootMixin,
      flowInputMixin,
    )(superclass) {
      #modal: ModalDriver;

      #flow: FlowDriver;

      #flowButtons: GenericFlowButtonDriver[] = [];

      #modalCallback: (() => void) | null = null;

      #removePageUpdatedCallback: (() => void) | null = null;

      #initComponents(ele: Element) {
        const button = new GenericFlowButtonDriver(ele, {
          logger: this.logger,
        });
        button.onClick(() => {
          this.#initModalContent(button.flowId);
        });
        this.subscribe(
          this.#onIsUserSelectedUpdate.bind(this),
          getSelectedUsersLoginIds,
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
        this.#modal.afterClose = () => {
          if (this.#modalCallback) {
            this.#removePageUpdatedCallback?.();
            this.#modalCallback = null;
          }
        };
        this.#flow = new FlowDriver(
          () => this.#modal.ele?.querySelector('descope-wc'),
          { logger: this.logger },
        );
        this.syncFlowTheme(this.#flow);
      }

      // eslint-disable-next-line class-methods-use-this
      #onModalNeeded() {
        this.#modal.open();
        this.#removePageUpdatedCallback?.();
      }

      #openModalIfNeeded(modal: ModalDriver, cbRef: () => void | null) {
        const cb = () => this.#onModalNeeded();
        // eslint-disable-next-line no-param-reassign
        cbRef = cb;
        this.#removePageUpdatedCallback = this.#flow.onPageUpdated(cbRef);
      }

      #initModalContent(flowId: string) {
        this.#modal.setContent(
          this.createFlowTemplate({
            flowId,
            client: {
              userIds: getSelectedUsersUserIds(this.state),
              loginIds: getSelectedUsersAllIds(this.state),
              usersAndRoles: getSelectedUsersRolesList(this.state),
            },
            tenant: this.tenantId,
          }),
        );
        this.#openModalIfNeeded(this.#modal, this.#modalCallback);
        this.#flow.onSuccess(() => {
          this.#modal.close();
          this.actions.searchUsers();
        });
      }

      #onIsUserSelectedUpdate = withMemCache(
        (selectedUsers: ReturnType<typeof getSelectedUsersLoginIds>) => {
          this.#flowButtons.forEach((button) => {
            if (
              (button.enableMode === 'onlyOne' && selectedUsers.length === 1) ||
              (button.enableMode === 'oneOrMore' && selectedUsers.length > 0) ||
              button.enableMode === 'always'
            ) {
              button.enable();
            } else {
              button.disable();
            }
          });
        },
      );

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();
        this.#initModal();
        this.#initFlowButtons();
        this.#onIsUserSelectedUpdate(getSelectedUsersLoginIds(this.state));
      }
    },
);
