export default `
<descope-container data-editor-type="container" direction="column" id="ROOT" space-between="md" st-horizontal-padding="0rem" st-vertical-padding="0rem" st-align-items="start" st-justify-content="safe center" st-background-color="#80808000" st-host-width="100%" st-gap="0.5rem">
   <descope-text full-width="false" id="titleText" italic="false" mode="primary" text-align="center" variant="subtitle2">Edit user</descope-text>
   <descope-text-field bordered="true" full-width="true" id="loginIdInput" label="Login ID" max="100" name="loginId" placeholder="" required="true" size="sm"></descope-text-field>
   <descope-email-field bordered="true" data-errormessage-pattern-mismatch="Must be a valid email" full-width="true" id="emailInput" label="Email" max="100" name="email" placeholder="Not required if used as login ID" required="false" size="sm"></descope-email-field>
   <descope-text-field bordered="true" full-width="true" id="nameInput" label="Name" max="100" name="displayName" placeholder="Enter name" required="false" size="sm" border-radius="sm"></descope-text-field>
   <descope-phone-field bordered="true" country-input-placeholder="Not required if used as login ID" data-errormessage-missing-value="Required" data-errormessage-pattern-mismatch-too-short="Please enter a valid phone" default-code="autoDetect" full-width="true" id="phoneInput" label="Phone" maxlength="20" minlength="6" name="phone" phone-input-placeholder="" size="sm" type="tel"></descope-phone-field>
   <descope-multi-select-combo-box bordered="true" full-width="true" id="rolesInput" label="Roles" name="roles" size="sm" item-label-path="data-name" item-value-path="data-id" data-id="roles-multiselect" allow-custom-value="false" clear-button-visible="true"></descope-multi-select-combo-box>
   <descope-container data-editor-type="container" direction="row" id="buttonsContainer" st-horizontal-padding="0rem" st-vertical-padding="1rem" st-align-items="start" st-justify-content="flex-end" st-background-color="#ffffff00" st-host-width="100%" st-gap="0.5rem">
      <descope-button data-type="button" formnovalidate="false" full-width="false" id="editUserCancelButton" shape="" size="sm" variant="outline" data-testid="edit-user-modal-cancel" data-id="modal-cancel" mode="primary" square="false">Cancel</descope-button>
      <descope-button data-type="button" formnovalidate="false" full-width="false" id="editUserSubmitButton" shape="" size="sm" variant="contained" data-testid="edit-user-modal-submit" data-id="modal-submit" mode="primary" square="false">Edit</descope-button>
   </descope-container>
</descope-container>
`;
