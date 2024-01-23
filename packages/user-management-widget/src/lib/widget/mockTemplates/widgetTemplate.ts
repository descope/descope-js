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
    <descope-text-field data-id="search-input" placeholder="Search" size="md" bordered="true"></descope-text-field>

    <descope-container
      direction="row"
      st-horizontal-padding="0rem"
      st-vertical-padding="0rem"
      st-justify-content="flex-end"
      st-gap="0.5em"
      st-host-width="auto"
    >
      <descope-button data-id="delete-users" mode="primary" variant="outline" size="md">Delete</descope-button>
      <descope-button data-id="create-user" mode="primary" variant="contained" size="md">+ User</descope-button>
    </descope-container>
    </descope-container>
    <descope-grid
      data-id="users-table"
      bordered="true"
      size="xs"
      column-reordering-allowed
      st-host-height="300px"
      style="width: 100%"
    >
      <descope-grid-selection-column frozen auto-width></descope-grid-selection-column>
      <descope-grid-text-column path="loginIds" header="Login ID" resizable></descope-grid-text-column>
      <descope-grid-text-column path="name" header="Name" resizable></descope-grid-text-column>
      <descope-grid-text-column path="email" header="Email" resizable></descope-grid-text-column>
      <descope-grid-text-column path="phone" header="Phone" resizable></descope-grid-text-column>
    </descope-grid>
  </descope-container>
`;
