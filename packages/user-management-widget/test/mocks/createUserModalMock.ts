export default `
<descope-container data-editor-type="container" direction="column" id="ROOT" space-between="md" st-horizontal-padding="0rem" st-vertical-padding="0rem" st-align-items="start" st-justify-content="safe center" st-background-color="#80808000" st-host-width="100%" st-gap="0.5rem">
  <descope-text full-width="false" id="titleText" italic="false" mode="primary" text-align="center" variant="subtitle2">New user</descope-text>
  <descope-text-field bordered="true" full-width="true" id="loginIdInput" label="Login ID" max="100" name="loginId" placeholder="Enter email or phone" required="true" size="sm"></descope-text-field>
  <descope-text-field border-radius="sm" bordered="true" full-width="true" id="nameInput" label="Name" max="100" name="displayName" placeholder="Enter name" required="false" size="sm"></descope-text-field>
  <descope-email-field bordered="true" data-errormessage-pattern-mismatch="Must be a valid email" full-width="true" id="emailInput" label="Email" max="100" name="email" placeholder="Not required if used as login ID" required="false" size="sm"></descope-email-field>
  <descope-phone-field bordered="true" country-input-placeholder="" data-errormessage-missing-value="Required" data-errormessage-pattern-mismatch-too-short="Please enter a valid phone" default-code="autoDetect" full-width="true" id="phoneInput" label="Phone" maxlength="20" minlength="6" name="phone" phone-input-placeholder="Not required if used as login ID" size="sm" type="tel"></descope-phone-field>
  <descope-multi-select-combo-box bordered="true" data-id="roles-multiselect" full-width="true" id="rolesInput" item-label-path="data-name" item-value-path="data-id" label="Roles" name="roles" size="sm" allow-custom-value="false" clear-button-visible="true"></descope-multi-select-combo-box>
  <descope-container data-editor-type="container" direction="row" id="buttonsContainer" st-horizontal-padding="0rem" st-vertical-padding="1rem" st-align-items="start" st-justify-content="flex-end" st-background-color="#ffffff00" st-host-width="100%" st-gap="0rem">
    <descope-button data-id="modal-cancel" data-testid="create-user-modal-cancel" data-type="button" formNoValidate="false" full-width="false" id="createUserCancelButton" shape="" size="xs" variant="link" mode="primary" square="false">Cancel</descope-button>
    <descope-button data-id="modal-submit" data-testid="create-user-modal-submit" data-type="button" formNoValidate="false" full-width="false" id="createUserSubmitButton" shape="" size="xs" variant="contained" mode="primary" square="false">Create</descope-button>
  </descope-container>
</descope-container>
`;
