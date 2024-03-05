import { compose } from '../../../../helpers/compose';
import { createTemplate } from '../../../../helpers/dom';
import { createSingletonMixin } from '../../../../helpers/mixins';
import { descopeUiMixin } from '../../../../mixins/descopeUiMixin/descopeUiMixin';
import { initElementMixin } from '../../../../mixins/initElementMixin';
import { initLifecycleMixin } from '../../../../mixins/initLifecycleMixin';
import { loggerMixin } from '../../../../mixins/loggerMixin';
import { fetchWidgetPagesMixin } from '../../fetchWidgetPagesMixin';
import { stateManagementMixin } from '../../stateManagementMixin';

export const initWidgetRootMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class InitWidgetRootMixinClass extends compose(
      loggerMixin,
      initLifecycleMixin,
      descopeUiMixin,
      initElementMixin,
      fetchWidgetPagesMixin,
      stateManagementMixin,
    )(superclass) {
      async #initWidgetRoot() {
        const template = createTemplate(
          // await this.fetchWidgetPage('root.html'),
          `
          <descope-container data-editor-type="container" direction="column" id="ROOT" space-between="md" st-horizontal-padding="1rem" st-vertical-padding="1rem" st-align-items="safe center" st-justify-content="safe center" st-host-width="100%" st-gap="1rem">
              <descope-container data-editor-type="container" direction="row" id="headerContainer" st-horizontal-padding="0rem" st-vertical-padding="0rem" st-align-items="start" st-justify-content="space-between" st-background-color="#ffffff00" st-host-width="100%" st-gap="0rem">
                  <descope-text-field bordered="true" data-id="search-input" data-testid="search-input" full-width="false" id="search" label="" max="100" name="" placeholder="Search" required="false" size="sm"></descope-text-field>
                  <descope-container data-editor-type="container" direction="row" id="buttonsContainer" st-horizontal-padding="0rem" st-vertical-padding="0rem" st-align-items="start" st-justify-content="flex-end" st-background-color="#ffffff00" st-host-width="auto" st-gap="0.5rem">
                    <descope-button data-id="delete-users" data-testid="delete-users-trigger" data-type="button" formNoValidate="false" full-width="false" id="deleteUsers" shape="" size="sm" variant="outline" mode="primary" square="false">Delete</descope-button>
                    <!-- descope-button data-id="reset-password" data-testid="reset-password-trigger" data-type="button" formNoValidate="false" full-width="false" id="resetPassword" shape="" size="sm" variant="outline" mode="primary" square="false">Reset Password</!-->
                    <descope-button data-id="remove-passkey" data-testid="remove-passkey-trigger" data-type="button" formNoValidate="false" full-width="false" id="removePasskey" shape="" size="sm" variant="outline" mode="primary" square="false">Remove Passkey</descope-button>
                    <descope-button data-id="disable-user" data-testid="disable-user-trigger" data-type="button" formNoValidate="false" full-width="false" id="disableUser" shape="" size="sm" variant="outline" mode="primary" square="false">Disable</descope-button>
                    <descope-button data-id="enable-user" data-testid="enable-user-trigger" data-type="button" formNoValidate="false" full-width="false" id="enableUser" shape="" size="sm" variant="outline" mode="primary" square="false">Activate</descope-button>
                    <descope-button data-id="edit-user" data-testid="edit-user-trigger" data-type="button" formNoValidate="false" full-width="false" id="editUser" shape="" size="sm" variant="outline" mode="primary" square="false">Edit User</descope-button>
                    <descope-button data-id="create-user" data-testid="create-user-trigger" data-type="button" formNoValidate="false" full-width="false" id="createUser" shape="" size="sm" variant="contained" mode="primary" square="false">+ User</descope-button>
                  </descope-container>
              </descope-container>
              <descope-grid column-reordering-allowed="true" data-id="users-table" size="sm" st-host-height="300px" style="width:100%">
                  <descope-grid-selection-column auto-width="true" frozen="true"></descope-grid-selection-column>
                  <descope-grid-text-column header="Login ID" path="loginIds" resizable="true"></descope-grid-text-column>
                  <descope-grid-custom-column header="Status" path="status" resizable="true" sortable="true">
                      <descope-badge bordered="true" data-pattern="invited" mode="default" size="xs" st-text-transform="capitalize"></descope-badge>
                      <descope-badge bordered="true" data-pattern="active" mode="primary" size="xs" st-text-transform="capitalize"></descope-badge>
                      <descope-badge bordered="true" data-pattern="disabled" mode="error" size="xs" st-text-transform="capitalize"></descope-badge>
                  </descope-grid-custom-column>
                  <descope-grid-text-column header="Name" path="name" resizable="true" sortable="true"></descope-grid-text-column>
                  <descope-grid-text-column header="Email" path="email" resizable="true" sortable="true"></descope-grid-text-column>
                  <descope-grid-text-column header="Phone" path="phone" resizable="true" sortable="true"></descope-grid-text-column>
                  <descope-grid-text-column header="Roles" path="roles" resizable="true" sortable="true"></descope-grid-text-column>
              </descope-grid>
          </descope-container>
          `,
        );
        await this.loadDescopeUiComponents(template);
        this.contentRootElement.append(template.content.cloneNode(true));
      }

      // eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-empty-function
      async onWidgetRootReady() {}

      async init() {
        await super.init?.();

        await Promise.all([
          this.#initWidgetRoot(),
          this.actions.searchUsers(),
          this.actions.getTenantRoles(),
        ]);

        this.onWidgetRootReady();
      }
    },
);
