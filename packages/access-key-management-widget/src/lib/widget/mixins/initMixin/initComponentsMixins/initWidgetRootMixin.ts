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
          `
            <descope-container data-editor-type="container" direction="column" id="ROOT" space-between="md" st-horizontal-padding="1rem" st-vertical-padding="1rem" st-align-items="safe center" st-justify-content="safe center" st-host-width="100%" st-gap="1rem">
              <descope-container data-editor-type="container" direction="row" id="headerContainer" st-horizontal-padding="0rem" st-vertical-padding="0rem" st-align-items="start" st-justify-content="space-between" st-background-color="#ffffff00" st-host-width="100%" st-gap="0rem">
                  <descope-text-field bordered="true" data-id="search-input" data-testid="search-input" full-width="false" id="search" label="" max="100" name="" placeholder="Search" required="false" size="sm"></descope-text-field>
                  <descope-container data-editor-type="container" direction="row" id="buttonsContainer" st-horizontal-padding="0rem" st-vertical-padding="0rem" st-align-items="start" st-justify-content="flex-end" st-background-color="#ffffff00" st-host-width="auto" st-gap="0.5rem">
                      <descope-button data-id="delete-access-keys" data-testid="delete-access-keys-trigger" data-type="button" formNoValidate="false" full-width="false" id="deleteAccessKeys" shape="" size="sm" variant="outline" mode="primary" square="false">Delete</descope-button>
                      <descope-button data-id="create-access-key" data-testid="create-access-key-trigger" data-type="button" formNoValidate="false" full-width="false" id="createAccessKey" shape="" size="sm" variant="contained" mode="primary" square="false">+ Access Key</descope-button>
                      <descope-button data-id="activate-access-keys" data-testid="activate-access-keys-trigger" data-type="button" formNoValidate="false" full-width="false" id="activateAccessKeys" shape="" size="sm" variant="contained" mode="primary" square="false">Activate</descope-button>
                      <descope-button data-id="deactivate-access-keys" data-testid="deactivate-access-keys-trigger" data-type="button" formNoValidate="false" full-width="false" id="deactivateAccessKeys" shape="" size="sm" variant="contained" mode="primary" square="false">Deactivate</descope-button>
                  </descope-container>
              </descope-container>
              <descope-grid column-reordering-allowed="true" data-id="access-keys-table" size="sm" st-host-height="300px" style="width:100%">
                  <descope-grid-selection-column auto-width="true" frozen="true"></descope-grid-selection-column>
                  <descope-grid-text-column header="Name" path="name" resizable="true" sortable="true"></descope-grid-text-column>
                  <descope-grid-custom-column header="Status" path="status" resizable="true">
                    <descope-badge bordered="true" data-pattern="inactive" mode="default" size="xs" st-text-transform="capitalize"></descope-badge>
                    <descope-badge bordered="true" data-pattern="expired" mode="default" size="xs" st-text-transform="capitalize"></descope-badge>
                    <descope-badge bordered="true" data-pattern="active" mode="primary" size="xs" st-text-transform="capitalize"></descope-badge>
                  </descope-grid-custom-column>
                  <descope-grid-text-column header="Created By" path="createdBy" resizable="true" sortable="true"></descope-grid-text-column>
                  <descope-grid-text-column header="Expiration Time" path="expireTime" resizable="true" sortable="true"></descope-grid-text-column>
                  <descope-grid-text-column header="Roles" path="roleNames" resizable="true"></descope-grid-text-column>
                  <descope-grid-text-column header="Client ID" path="clientId" resizable="true" sortable="true"></descope-grid-text-column>
                  <descope-grid-text-column header="ID" path="id" resizable="true" sortable="true"></descope-grid-text-column>
              </descope-grid>
          </descope-container>
              `,
          // await this.fetchWidgetPage('root.html'),
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
          this.actions.searchAccessKeys(),
          this.actions.getTenantRoles(),
        ]);

        this.onWidgetRootReady();
      }
    },
);
