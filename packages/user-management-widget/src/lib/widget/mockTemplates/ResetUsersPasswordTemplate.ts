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
  <descope-text variant="h3" mode="surface">Reset Password</descope-text>
  <descope-text data-id="body-text" variant="body1" mode="surface">Reset password</descope-text>

  <descope-container
    direction="row"
    st-justify-content="flex-end"
    st-gap="1rem"
    st-host-width="100%"
    st-horizontal-padding="0rem"
    st-vertical-padding="0rem"
  >
  <descope-button data-id="modal-cancel" mode="primary" variant="outline" size="md">Cancel</descope-button>
  <descope-button data-id="modal-submit" mode="primary" variant="contained" size="md">Send Email</descope-button>
  </descope-container>
</descope-container>
`;
