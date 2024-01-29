export default `
<descope-container
  direction="column"
  space-between="md"
  st-horizontal-padding="1rem"
  st-vertical-padding="1rem"
  st-align-items="safe center"
  st-gap="1rem"
>
  <descope-container
    direction="row"
    st-horizontal-padding="0rem"
    st-vertical-padding="0rem"
    st-align-items="safe center"
    st-gap="0rem"
    st-justify-content="space-between"
  >
    <descope-text-field data-testid="search-input" data-id="search-input" placeholder="Search" size="sm" bordered="true"></descope-text-field>

    <descope-container
      direction="row"
      st-horizontal-padding="0rem"
      st-vertical-padding="0rem"
      st-justify-content="flex-end"
      st-gap="0.5em"
      st-host-width="auto"
    >
      <descope-button data-testid="delete-users-trigger" data-id="delete-users" mode="primary" variant="outline" size="sm">Delete</descope-button>
      <descope-button data-testid="create-user-trigger" data-id="create-user" mode="primary" variant="contained" size="sm">+ User</descope-button>
    </descope-container>
    </descope-container>
    <descope-grid
      data-id="users-table"
      size="sm"
      column-reordering-allowed
      st-host-height="300px"
      style="width: 100%"
    >
      <descope-grid-selection-column frozen auto-width></descope-grid-selection-column>
      <descope-grid-text-column path="loginIds" header="Login ID" resizable></descope-grid-text-column>
      <descope-grid-text-column sortable="true" path="name" header="Name" resizable></descope-grid-text-column>
      <descope-grid-custom-column sortable="true" path="status" header="Status" resizable>
        <descope-badge mode="default" pattern="invited" bordered="true" size="xs" st-text-transform="capitalize"></descope-badge>
        <descope-badge mode="primary" pattern="active" bordered="true" size="xs" st-text-transform="capitalize"></descope-badge>
        <descope-badge mode="error" pattern="disabled" bordered="true" size="xs" st-text-transform="capitalize"></descope-badge>
      </descope-grid-custom-column>
      <descope-grid-text-column sortable="true" path="email" header="Email" resizable></descope-grid-text-column>
      <descope-grid-text-column sortable="true" path="phone" header="Phone" resizable></descope-grid-text-column>
    </descope-grid>
  </descope-container>
`;
