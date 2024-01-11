// TODO: remove
export default `
<descope-container
  direction="column"
  st-justify-content="safe center"
  st-gap="1rem"
  st-host-width="100%"
  st-background-color="none"
  st-horizontal-padding="0rem"
  st-vertical-padding="0rem"
>
  <descope-text variant="h3" mode="surface">New User</descope-text>
  <descope-text-field name="loginId" label="Login Id" bordered="true"></descope-text-field>
  <descope-email-field name="email" label="Email" bordered="true"></descope-email-field>
  <descope-text-field name="displayName" label="Name" bordered="true"></descope-text-field>
  <descope-phone-field name="phone" label="Phone" bordered="true"></descope-phone-field>

  <descope-container
    direction="row"
    st-justify-content="flex-end"
    st-gap="1rem"
    st-host-width="100%"
    st-horizontal-padding="0rem"
    st-vertical-padding="0rem"
  >
  <descope-button id="modal-cancel" mode="primary" variant="outline" size="md">Cancel</descope-button>
  <descope-button id="modal-submit" mode="primary" variant="contained" size="md">Create</descope-button>
  </descope-container>
</descope-container>
`;
