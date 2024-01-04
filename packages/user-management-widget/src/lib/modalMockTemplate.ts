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
  <descope-email-field name="email" label="email" bordered="true"></descope-email-field>
  <descope-text-field name="name" label="name" bordered="true"></descope-text-field>
  <descope-phone-field name="phone" label="phone" bordered="true"></descope-phone-field>

  <descope-container
    direction="row"
    st-justify-content="flex-end"
    st-gap="1rem"
    st-host-width="100%"
    st-background-color="none"
    st-horizontal-padding="0rem"
    st-vertical-padding="0rem"
  >
  <descope-button id="modal-cancel" mode="link" variant="contained" size="md">Cancel</descope-button>
  <descope-button id="modal-submit" mode="primary" variant="contained" size="md">Submit</descope-button>
  </descope-container>
</descope-container>
`;
