export default `
<descope-container data-editor-type="container" direction="column" id="ROOT" space-between="md" st-horizontal-padding="1rem" st-vertical-padding="1rem" st-align-items="safe center" st-justify-content="safe center" st-host-width="100%" st-gap="1rem">
    <descope-container data-editor-type="container" direction="row" id="headerContainer" st-horizontal-padding="0rem" st-vertical-padding="0rem" st-align-items="start" st-justify-content="space-between" st-background-color="#ffffff00" st-host-width="100%" st-gap="0rem">
        <descope-text-field bordered="true" data-id="search-input" data-testid="search-input" full-width="false" id="search" label="" max="100" name="" placeholder="Search" required="false" size="sm"></descope-text-field>
        <descope-container data-editor-type="container" direction="row" id="buttonsContainer" st-horizontal-padding="0rem" st-vertical-padding="0rem" st-align-items="start" st-justify-content="flex-end" st-background-color="#ffffff00" st-host-width="auto" st-gap="0.25rem">
            <descope-button data-id="delete-roles" data-testid="delete-roles-trigger" data-type="button" formNoValidate="false" full-width="false" id="deleteRoles" shape="" size="sm" variant="outline" mode="primary" square="false">Delete</descope-button>
            <descope-button data-id="edit-role" data-testid="edit-role-trigger" data-type="button" formNoValidate="false" full-width="false" id="updateRole" shape="" size="sm" variant="contained" mode="primary" square="false">Edit</descope-button>
            <descope-button data-id="create-role" data-testid="create-role-trigger" data-type="button" formNoValidate="false" full-width="false" id="createRole" shape="" size="sm" variant="contained" mode="primary" square="false">+ Role</descope-button>
        </descope-container>
    </descope-container>
    <descope-grid column-reordering-allowed="true" data-id="roles-table" size="sm" st-host-height="300px" style="width:100%">
        <descope-grid-selection-column auto-width="true" frozen="true"></descope-grid-selection-column>
        <descope-grid-text-column header="Name" path="name" resizable="true" sortable="true"></descope-grid-text-column>
        <descope-grid-text-column header="Description" path="description" resizable="true" sortable="true"></descope-grid-text-column>
        <descope-grid-text-column header="Permissions" path="permissionNames" resizable="true"></descope-grid-text-column>
        <descope-grid-custom-column header="Editable" path="editable" resizable="true">
          <descope-badge bordered="true" data-pattern="no" mode="default" size="xs" st-text-transform="capitalize"></descope-badge>
          <descope-badge bordered="true" data-pattern="yes" mode="primary" size="xs" st-text-transform="capitalize"></descope-badge>
        </descope-grid-custom-column>
    </descope-grid>
</descope-container>
`;
