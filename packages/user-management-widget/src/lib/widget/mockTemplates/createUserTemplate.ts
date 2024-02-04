export default `
<descope-container
  direction="column"
  st-justify-content="safe center"
  st-gap="1rem"
  st-host-width="100%"
  st-background-color="none"
  st-horizontal-padding="0rem"
  st-vertical-padding="0rem"
  st-border-radius="sm"
>
  <descope-text variant="subtitle1" mode="surface">New User</descope-text>
  <descope-text-field name="loginId" label="Login ID" bordered="true" required="true" size="sm"></descope-text-field>
  <descope-email-field name="email" label="Email" bordered="true"></descope-email-field>
  <descope-text-field name="displayName" label="Name" bordered="true"></descope-text-field>
  <descope-phone-field name="phone" label="Phone" bordered="true"></descope-phone-field>

  <descope-container
    direction="row"
    st-justify-content="flex-end"
    st-gap="1rem"
    st-host-width="100%"
    st-horizontal-padding="0.75rem"
    st-vertical-padding="0.75rem"
    st-background-color="none"
  >
  <descope-button data-testid="create-user-modal-cancel" data-id="modal-cancel" mode="primary" variant="link" size="sm">Cancel</descope-button>
  <descope-button data-testid="create-user-modal-submit" data-id="modal-submit" mode="primary" variant="contained" size="sm">Create</descope-button>
  </descope-container>
</descope-container>
`;
