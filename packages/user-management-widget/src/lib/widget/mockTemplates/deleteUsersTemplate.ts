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
  data-testid="delete-users-modal"
>
  <descope-text variant="subtitle1" mode="surface">Delete Users</descope-text>
  <descope-text data-id="body-text" variant="body1" mode="surface">Delete user</descope-text>

  <descope-container  
    direction="row"
    st-justify-content="flex-end"
    st-gap="1rem"
    st-host-width="100%"
    st-horizontal-padding="0rem"
    st-vertical-padding="0rem"
  >
  <descope-button data-testid="delete-users-modal-cancel" data-id="modal-cancel" mode="primary" variant="link" size="md">Cancel</descope-button>
  <descope-button data-testid="delete-users-modal-submit" data-id="modal-submit" mode="error" variant="contained" size="md">Delete</descope-button>
  </descope-container>
</descope-container>
`;
