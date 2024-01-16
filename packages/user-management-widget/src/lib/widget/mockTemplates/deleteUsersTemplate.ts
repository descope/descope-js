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
  <descope-text variant="h3" mode="surface">Delete Users</descope-text>
  <descope-text id="body-text" variant="body1" mode="surface">Delete user</descope-text>

  <descope-container
    direction="row"
    st-justify-content="flex-end"
    st-gap="1rem"
    st-host-width="100%"
    st-horizontal-padding="0rem"
    st-vertical-padding="0rem"
  >
  <descope-button id="modal-cancel" mode="primary" variant="outline" size="md">Cancel</descope-button>
  <descope-button id="modal-submit" mode="primary" variant="contained" size="md">Delete</descope-button>
  </descope-container>
</descope-container>
`;
