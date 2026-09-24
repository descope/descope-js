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
      required="true"
      edit-flow-id="tenant-profile-set-name"
      delete-flow-id=""
    ></descope-user-attribute>
    <descope-user-attribute
      data-id="tenant-email-domains-edit"
      label="Tenant Email Domains"
      full-width="true"
      required="false"
      edit-flow-id="edit-tenant-email-domains"
      delete-flow-id="delete-tenant-email-domains"
    ></descope-user-attribute>
    <descope-user-attribute
      data-id="tenant-enforce-sso-edit"
      label="Tenant Enforce SSO"
      type="boolean"
      full-width="true"
      required="false"
      edit-flow-id="edit-tenant-enforce-sso"
      delete-flow-id="delete-tenant-enforce-sso"
    ></descope-user-attribute>
    <descope-user-attribute
      data-id="tenant-force-sso-exclusions-edit"
      label="Tenant Force SSO Exclusions"
      full-width="true"
      required="false"
      edit-flow-id="edit-tenant-sso-exclusions"
      delete-flow-id="delete-tenant-sso-exclusions"
    ></descope-user-attribute>
    <descope-user-attribute
      data-id="customAttributes.department"
      label="Department"
      full-width="true"
      required="false"
      edit-flow-id="edit-department"
      delete-flow-id=""
    ></descope-user-attribute>
    <descope-divider id="2mXCne0kTY" italic="false" mode="primary" variant="body1" vertical="false"></descope-divider>
    <descope-link data-id="tenant-admin-link-sso" italic="false" underline="true" variant="body1" text-align="center" full-width="false" target="_blank" mode="primary" id="_Q1UFBN56C">SSO Setup</descope-link>
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
      <descope-multi-sso
        full-width="true"
        data-create-flow-id="tenant-profile-create-sso-config"
        data-delete-flow-id="tenant-profile-delete-sso-config"
        label="Configurations"
        allow-create="true"
        allow-delete="true"
        allow-configure="true"
        create-button-label="Add"
        id="4aD7P6mPyn"
      >
        <descope-icon slot="title-icon" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJjdXJyZW50Q29sb3IiPgogIDxwYXRoIGQ9Ik0xMi42NSAxMEMxMS44MyA3LjY3IDkuNjEgNiA3IDZjLTMuMzEgMC02IDIuNjktNiA2czIuNjkgNiA2IDZjMi42MSAwIDQuODMtMS42NyA1LjY1LTRIMTd2NGg0di00aDJ2LTRIMTIuNjV6TTcgMTRjLTEuMSAwLTItLjktMi0ycy45LTIgMi0yIDIgLjkgMiAyLS45IDItMiAyeiIvPgo8L3N2Zz4="></descope-icon>
        <descope-icon slot="create-button-icon" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJjdXJyZW50Q29sb3IiPgogIDxwYXRoIGQ9Ik0xOSAxMWgtNlY1aC0ydjZINXYyaDZ2Nmgydi02aDZ2LTJ6Ii8+Cjwvc3ZnPg=="></descope-icon>
        <descope-icon slot="delete-icon" src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTQiIGhlaWdodD0iMTgiIHZpZXdCb3g9IjAgMCAxNCAxOCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMSAxNkMxIDE3LjEgMS45IDE4IDMgMThIMTFDMTIuMSAxOCAxMyAxNy4xIDEzIDE2VjRIMVYxNlpNMyA2SDExVjE2SDNWNlpNMTAuNSAxTDkuNSAwSDQuNUwzLjUgMUgwVjNIMTRWMUgxMC41WiIgZmlsbD0iY3VycmVudENvbG9yIi8+PC9zdmc+"></descope-icon>
        <descope-icon slot="external-link-icon" src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTkgMTlINVY1SDEyVjNINUMzLjg5IDMgMyAzLjkgMyA1VjE5QzMgMjAuMSAzLjg5IDIxIDUgMjFIMTlDMjAuMSAyMSAyMSAyMC4xIDIxIDE5VjEySDE5VjE5Wk0xNCAzVjVIMTcuNTlMNy43NiAxNC44M0w5LjE3IDE2LjI0TDE5IDYuNDFWMTBIMjFWM0gxNFoiIGZpbGw9ImN1cnJlbnRDb2xvciIvPjwvc3ZnPg=="></descope-icon>
      </descope-multi-sso>
    </descope-container>
  </descope-container>
</descope-container>
`;
