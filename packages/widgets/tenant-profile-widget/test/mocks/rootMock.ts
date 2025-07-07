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
>
  <descope-container
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
  ></descope-container>
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
      data-id="tenant-name-edit"
      label="Tenant Name"
      full-width="true"
      required="false"
    ></descope-user-attribute>
    <descope-user-attribute
      data-id="tenant-email-domains-edit"
      label="Tenant Email Domains"
      full-width="true"
      required="false"
    ></descope-user-attribute>
    <descope-user-attribute
      data-id="tenant-enforce-sso-edit"
      label="Tenant Enforce SSO"
      type="boolean"
      full-width="true"
      required="false"
    ></descope-user-attribute>
    <descope-divider id="2mXCne0kTY" italic="false" mode="primary" variant="body1" vertical="false"></descope-divider>
    <descope-container
      data-editor-type="container"
      id="isG9wyAH3S"
      st-items-grow="1"
      direction="row"
      st-host-width="100%"
      st-horizontal-padding="1rem"
      st-vertical-padding="2rem"
      st-align-items="center"
      st-justify-content="space-between"
      st-background-color="#ffffff00"
      st-gap="1rem"
    >
      <descope-enriched-text
        full-width="false"
        id="4MLf3AZ9ve"
        italic="false"
        link-target-blank="true"
        mode="primary"
        text-align="left"
        variant="body1"
      >Set up and manage your SSO</descope-enriched-text>
      <descope-link
        data-id="tenant-admin-link-sso"
        full-width="false"
        href="#"
        id="DHwR5a3IpS"
        italic="false"
        mode="primary"
        target="_blank"
        text-align="right"
        variant="body1"
      >SSO Setup</descope-link>
    </descope-container>
  </descope-container>
</descope-container>
`;
