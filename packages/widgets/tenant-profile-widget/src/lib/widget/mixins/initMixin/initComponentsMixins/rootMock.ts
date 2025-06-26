export default `
<descope-container
  data-editor-type="container"
  direction="column"
  id="ROOT"
  space-between="md"
  st-horizontal-padding="1rem"
  st-vertical-padding="1rem"
  st-align-items="safe center"
  st-justify-content="safe center"
  st-background-color=""
  st-host-width="100%"
  st-gap="1rem"
  ><descope-container
    data-editor-type="container"
    direction="row"
    id="avatarContainer"
    st-horizontal-padding="0rem"
    st-vertical-padding="0rem"
    st-align-items="start"
    st-justify-content="flex-start"
    st-background-color="#ffffff00"
    st-host-width="100%"
    st-gap="0rem"
    ><descope-avatar
      flow-id="update-pic"
      editable="true"
      data-id="avatar"
      size="lg"
    ></descope-avatar></descope-container
  <descope-container
    data-editor-type="container"
    direction="column"
    id="userAttrsContainer"
    st-horizontal-padding="0rem"
    st-vertical-padding="1rem"
    st-align-items="start"
    st-justify-content="flex-start"
    st-background-color="#ffffff00"
    st-host-width="100%"
    st-gap="2rem"
    >
    <descope-user-attribute
      data-id="tenant-name"
      label="Tenant Name"
      full-width="true"
      required="false"
    ></descope-user-attribute>
    <descope-user-attribute
      data-id="tenant-email-domains"
      label="Tenant Email Domains"
      full-width="true"
      required="false"
    ></descope-user-attribute>
    <descope-user-attribute
      data-id="tenant-enforce-sso"
      label="Tenant Enforce SSO"
      type="boolean"
      full-width="true"
      required="false"
    ></descope-user-attribute></descope-container
  >
</descope-container
>
`;
