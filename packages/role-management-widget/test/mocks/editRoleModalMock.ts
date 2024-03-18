export default `
<descope-container data-editor-type="container" direction="column" id="ROOT" space-between="md" st-horizontal-padding="0rem" st-vertical-padding="0rem" st-align-items="start" st-justify-content="safe center" st-background-color="#80808000" st-host-width="100%" st-gap="1rem">
  <descope-text full-width="false" id="titleText" italic="false" mode="primary" text-align="center" variant="subtitle1">Edit Role</descope-text>
  <descope-text-field bordered="true" full-width="true" id="name" label="Name" max="100" name="name" placeholder="Name" required="true" size="sm" data-testid="edit-role-input-name"></descope-text-field>
  <descope-text-field bordered="true" full-width="true" id="description" label="Description" max="1024" name="description" placeholder="Description" required="false" size="sm" data-testid="edit-role-input-desc"></descope-text-field>
  <descope-multi-select-combo-box bordered="true" data-id="permissions-multiselect" full-width="true" id="permissionsInput" item-label-path="data-name" item-value-path="data-id" label="Permissions" name="permissionNames" size="sm" allow-custom-value="false" clear-button-visible="true" data-testid="create-role-input-permissions"></descope-multi-select-combo-box>
  <descope-container data-editor-type="container" direction="row" id="buttonsContainer" st-horizontal-padding="0rem" st-vertical-padding="0rem" st-align-items="start" st-justify-content="flex-end" st-background-color="#ffffff00" st-host-width="100%" st-gap="0.5rem">
    <descope-button data-id="modal-cancel" data-testid="edit-role-modal-cancel" data-type="button" formNoValidate="false" full-width="false" id="editRoleCancelButton" shape="" size="sm" variant="outline" mode="primary" square="false">Cancel</descope-button>
    <descope-button data-id="modal-submit" data-testid="edit-role-modal-submit" data-type="button" formNoValidate="false" full-width="false" id="editRoleSubmitButton" shape="" size="sm" variant="contained" mode="primary" square="false">Edit Role</descope-button>
  </descope-container>
</descope-container>
`;
