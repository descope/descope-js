export default `
<descope-container data-editor-type="container" direction="column" id="ROOT" space-between="md" st-horizontal-padding="0rem" st-vertical-padding="0rem" st-align-items="start" st-justify-content="safe center" st-background-color="#80808000" st-host-width="100%" st-gap="0.5rem">
  <descope-text full-width="false" id="titleText" italic="false" mode="primary" text-align="center" variant="subtitle2">New Access Key</descope-text>
  <descope-text-field bordered="true" full-width="true" id="name" label="Name" max="100" name="name" placeholder="Name" required="true" size="sm"></descope-text-field>
  <descope-combo-box bordered="true" data-id="expiration-combobox" full-width="true" id="expirationInput" required="true" item-label-path="data-name" item-value-path="data-id" label="Expiration" name="expiration" size="sm" allow-custom-value="false" default-value="30">
    <span data-name="30 Days" data-id="30">30 Days</span>
    <span data-name="60 Days" data-id="60">60 Days</span>
    <span data-name="90 Days" data-id="90">90 Days</span>
    <span data-name="Never" data-id="0">Never</span>
  </descope-combo-box>
  <descope-multi-select-combo-box bordered="true" data-id="roles-multiselect" full-width="true" id="rolesInput" item-label-path="data-name" item-value-path="data-id" label="Roles" name="roleNames" size="sm" allow-custom-value="false" clear-button-visible="true"></descope-multi-select-combo-box>
  <descope-container data-editor-type="container" direction="row" id="buttonsContainer" st-horizontal-padding="0rem" st-vertical-padding="0rem" st-align-items="start" st-justify-content="flex-end" st-background-color="#ffffff00" st-host-width="100%" st-gap="0.5rem">
    <descope-button data-id="modal-cancel" data-testid="create-access-key-modal-cancel" data-type="button" formNoValidate="false" full-width="false" id="createAccessKeyCancelButton" shape="" size="sm" variant="outline" mode="primary" square="false">Cancel</descope-button>
    <descope-button data-id="modal-submit" data-testid="create-access-key-modal-submit" data-type="button" formNoValidate="false" full-width="false" id="createAccessKeySubmitButton" shape="" size="sm" variant="contained" mode="primary" square="false">Create</descope-button>
  </descope-container>
</descope-container>
`;
