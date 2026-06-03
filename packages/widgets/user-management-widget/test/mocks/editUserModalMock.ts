export default `
<descope-container data-editor-type="container" direction="column" id="ROOT" space-between="md" st-horizontal-padding="0rem" st-vertical-padding="0rem" st-align-items="start" st-justify-content="safe center" st-background-color="#80808000" st-host-width="100%" st-gap="0.75rem">
   <descope-text full-width="false" id="titleText" italic="false" mode="primary" text-align="center" variant="subtitle2">Edit user</descope-text>
   <descope-text-field bordered="true" full-width="true" id="loginIdInput" label="Login ID" max="100" name="loginId" placeholder="" required="true" size="sm" helper-text="Used for identifying the user. Supports email or phone number."></descope-text-field>
   <descope-text full-width="false" id="userDetailsHeader" italic="false" mode="primary" text-align="center" variant="body1">User Details</descope-text>
   <descope-email-field bordered="true" data-errormessage-pattern-mismatch="Must be a valid email" full-width="true" id="emailInput" label="Email" max="100" name="email" placeholder="Not required if used as login ID" required="false" size="sm"></descope-email-field>
   <descope-text-field bordered="true" full-width="true" id="nameInput" label="Name" max="100" name="displayName" placeholder="Enter name" required="false" size="sm" border-radius="sm"></descope-text-field>
   <descope-phone-field bordered="true" country-input-placeholder="Not required if used as login ID" data-errormessage-missing-value="Required" data-errormessage-pattern-mismatch-too-short="Please enter a valid phone" default-code="autoDetect" full-width="true" id="phoneInput" label="Phone" maxlength="20" minlength="6" name="phone" phone-input-placeholder="" size="sm" type="tel"></descope-phone-field>
   <descope-container direction="column" st-horizontal-padding="0rem" st-vertical-padding="0rem" st-align-items="start" st-justify-content="safe center" st-background-color="#80808000" st-host-width="100%" st-gap="0rem">
     <descope-text full-width="false" id="tenantRolesHeader" italic="false" mode="primary" text-align="center" variant="body2">Tenant Roles</descope-text>
     <descope-text full-width="false" id="tenantRolesDescription" italic="false" mode="secondary" text-align="center" variant="body2">Define tenant roles</descope-text>
   </descope-container>
   <descope-multi-select-combo-box bordered="true" full-width="true" id="rolesInput" label="Roles" name="roles" size="sm" item-label-path="data-name" item-value-path="data-id" data-id="roles-multiselect" allow-custom-value="false" clear-button-visible="true"></descope-multi-select-combo-box>
   <descope-container data-id="sub-tenant-section" direction="column" st-horizontal-padding="0rem" st-vertical-padding="0rem" st-align-items="start" st-justify-content="safe center" st-background-color="#80808000" st-host-width="100%" st-gap="0.75rem">
     <descope-container direction="column" st-horizontal-padding="0rem" st-vertical-padding="0rem" st-align-items="start" st-justify-content="safe center" st-background-color="#80808000" st-host-width="100%" st-gap="0rem">
       <descope-text full-width="false" id="subTenantRolesHeader" italic="false" mode="primary" text-align="center" variant="body2">Sub Tenant Roles</descope-text>
       <descope-text full-width="false" id="subTenantRolesDescription" italic="false" mode="secondary" text-align="center" variant="body2">Define tenant roles</descope-text>
     </descope-container>
     <descope-multi-line-mappings data-id="sub-tenant-mappings" size="sm" full-width="true" max-rows="0" first-label="Sub Tenants" second-label="Roles" first-value-key="tenantId" second-value-key="roleNames" merge-rows="true">
       <span slot="add-button-content">+ Assign tenant/role</span>
     </descope-multi-line-mappings>
   </descope-container>
   <descope-container data-editor-type="container" direction="row" id="buttonsContainer" st-horizontal-padding="0rem" st-vertical-padding="1rem" st-align-items="start" st-justify-content="flex-end" st-background-color="#ffffff00" st-host-width="100%" st-gap="0rem">
      <descope-button data-type="button" formnovalidate="false" full-width="false" id="editUserCancelButton" shape="" size="xs" variant="link" data-testid="edit-user-modal-cancel" data-id="modal-cancel" mode="primary" square="false">Cancel</descope-button>
      <descope-button data-type="button" formnovalidate="false" full-width="false" id="editUserSubmitButton" shape="" size="xs" variant="contained" data-testid="edit-user-modal-submit" data-id="modal-submit" mode="primary" square="false">Edit</descope-button>
   </descope-container>
</descope-container>
`;
