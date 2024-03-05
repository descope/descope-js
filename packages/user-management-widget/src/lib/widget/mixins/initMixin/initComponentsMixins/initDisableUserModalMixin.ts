import { compose } from '../../../../helpers/compose';
import { createTemplate } from '../../../../helpers/dom';
import { createSingletonMixin } from '../../../../helpers/mixins';
import { formMixin } from '../../../../mixins/formMixin';
import { loggerMixin } from '../../../../mixins/loggerMixin';
import { modalMixin } from '../../../../mixins/modalMixin';
import { ButtonDriver } from '../../../drivers/ButtonDriver';
import { ModalDriver } from '../../../drivers/ModalDriver';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';
import { getSelectedUsersDetailsForDisplay } from '../../../state/selectors';
import { TextDriver } from '../../../drivers/TextDriver';

export const initDisableUserModalMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class InitDisableUserModalMixinClass extends compose(
      stateManagementMixin,
      modalMixin,
      loggerMixin,
      formMixin,
      initWidgetRootMixin,
    )(superclass) {
      disableUserModal: ModalDriver;

      #initCancelButton() {
        const cancelButton = new ButtonDriver(
          () =>
            this.disableUserModal.ele?.querySelector(
              '[data-id="modal-cancel"]',
            ),
          { logger: this.logger },
        );
        cancelButton.onClick(() => this.disableUserModal.close());
      }

      #initSubmitButton() {
        const submitButton = new ButtonDriver(
          () =>
            this.disableUserModal.ele?.querySelector(
              '[data-id="modal-submit"]',
            ),
          { logger: this.logger },
        );

        submitButton.onClick(() => {
          if (this.validateForm(this.disableUserModal.ele)) {
            const { loginId } = this.getFormData(this.disableUserModal.ele);
            this.actions.updateUser({
              // we are joining the ids in order to display it so we need to split it back
              loginId: loginId.split(', ')[0],
            });
            this.disableUserModal.close();
          }
        });
      }

      async #initEnableUserModal() {
        this.disableUserModal = this.createModal();
        this.disableUserModal.setContent(
          // createTemplate(await this.fetchWidgetPage('disable-user-modal.html')),
          createTemplate(`
            <descope-container border-radius="sm" data-editor-type="container" direction="column" id="ROOT" space-between="md" st-horizontal-padding="0rem" st-vertical-padding="0rem" st-align-items="start" st-justify-content="safe center" st-background-color="#80808000" st-host-width="100%" st-gap="1rem" class="descope-container" data-aria-hidden="true" aria-hidden="true">
              <descope-text full-width="false" id="titleText" italic="false" mode="primary" text-align="center" variant="subtitle1" class="descope-text">Disable User</descope-text>
              <descope-text data-id="body-text" full-width="false" id="bodyText" italic="false" mode="primary" text-align="center" variant="body1" class="descope-text">Delete fafa@fafa.com?</descope-text>
                <descope-container data-editor-type="container" direction="row" id="buttonsContainer" st-horizontal-padding="0rem" st-vertical-padding="0rem" st-align-items="start" st-justify-content="flex-end" st-background-color="#ffffff00" st-host-width="100%" st-gap="0.5rem" class="descope-container">
                  <descope-button data-id="modal-cancel" data-testid="delete-users-modal-cancel" data-type="button" full-width="false" id="deleteUserCancelButton" shape="" size="sm" variant="outline" mode="primary" square="false" role="button" class="descope-button">Cancel</descope-button>
                  <descope-button data-id="modal-submit" data-testid="delete-users-modal-submit" data-type="button" full-width="false" id="deleteUserSubmitButton" shape="" size="sm" variant="contained" mode="primary" square="false" role="button" class="descope-button">Disable</descope-button>
                </descope-container>
              </descope-container>
          `),
        );

        this.#initCancelButton();
        this.#initSubmitButton();

        const description = new TextDriver(
          this.disableUserModal.ele?.querySelector('[data-id="body-text"]'),
          { logger: this.logger },
        );

        this.disableUserModal.beforeOpen = async () => {
          const userDetails = getSelectedUsersDetailsForDisplay(this.state);
          description.text = `Disable ${userDetails}?`;
        };
      }

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        await this.#initEnableUserModal();
      }
    },
);
