// TODO: remove
export default `
<descope-container
  direction="column"
  space-between="md"
  st-horizontal-padding="1.5rem"
  st-vertical-padding="4rem"
  st-align-items="safe center"
  st-gap="2rem"
>
  <descope-container
    direction="row"
    st-horizontal-padding="0rem"
    st-vertical-padding="0rem"
    st-align-items="safe center"
    st-gap="0rem"
    st-justify-content="space-between"
  >
    <descope-text-field id="search" placeholder="Search" size="md" bordered="true"></descope-text-field>

    <descope-container
      direction="row"
      st-horizontal-padding="0rem"
      st-vertical-padding="0rem"
      st-justify-content="flex-end"
      st-gap="1rem"
      st-host-width="auto"
    >
      <descope-button id="reset" mode="primary" variant="outline" size="md">Reset Password</descope-button>
      <descope-button id="delete" mode="primary" variant="outline" size="md">Delete User</descope-button>
      <descope-button id="add" mode="primary" variant="contained" size="md">Add User</descope-button>        </descope-container>
    </descope-container>
    <descope-grid
      bordered="true"
      size="xs"
      column-reordering-allowed
      st-host-height="300px"
      style="width: 100%"
    >
      <descope-grid-selection-column frozen auto-width></descope-grid-selection-column>
      <descope-grid-column path="loginId" header="Login ID" resizable></descope-grid-column>
      <descope-grid-status-column path="status" header="Status" resizable status='["Active", "Inactive"]'></descope-grid-status-column>
      <descope-grid-column path="displayName" header="Name" resizable></descope-grid-column>
      <descope-grid-column path="email" header="Email" resizable></descope-grid-column>
      <descope-grid-column path="phone" header="Phone" resizable></descope-grid-column>
    </descope-grid>
  </descope-container>
`;
