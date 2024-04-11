export default `
<descope-container data-editor-type="container" direction="column" id="ROOT" space-between="md" st-horizontal-padding="1rem" st-vertical-padding="1rem" st-align-items="safe center" st-justify-content="safe center" st-host-width="100%" st-gap="1rem">
  <descope-container data-editor-type="container" direction="row" id="headerContainer" st-horizontal-padding="0rem" st-vertical-padding="0rem" st-align-items="start" st-justify-content="space-between" st-background-color="#ffffff00" st-host-width="100%" st-gap="0rem">
    <descope-text-field bordered="true" data-id="search-input" data-testid="search-input" full-width="false" id="search" label="" max="100" name="" placeholder="Search" required="false" size="sm"></descope-text-field>
    <descope-combo-box bordered="true" data-id="range-input" data-testid="range-input" full-width="false" id="range" item-label-path="data-name" item-value-path="data-id" name="" size="sm" allow-custom-value="false" default-value="day" max="100">
      <span data-name="Last 15 Minutes" data-id="minuets15">Last 15 Minutes</span>
      <span data-name="Last Hour" data-id="hour">Last Hour</span>
      <span data-name="Last 6 Hours" data-id="hour6">Last 6 Hours</span>
      <span data-name="Last 24 Hours" data-id="day">Last 24 Hours</span>
      <span data-name="Last 3 Days" data-id="day3">Last 3 Days</span>
      <span data-name="Last Week" data-id="week">Last Week</span>
      <span data-name="Last 2 Weeks" data-id="week2">Last 2 Weeks</span>
      <span data-name="Last Month" data-id="month">Last Month</span>
    </descope-combo-box>
  </descope-container>
  <descope-grid bordered="true" column-reordering-allowed="true" data-id="audit-table" size="sm" st-host-height="300px" style="width:100%">
  <descope-grid-text-column header="Occurred" path="occurredFormatted" resizable="true" sortable="false"></descope-grid-text-column>
  <descope-grid-text-column header="User ID" path="userId" resizable="true" sortable="false"></descope-grid-text-column>
    <descope-grid-text-column header="Actor" path="actorId" resizable="true" sortable="false"></descope-grid-text-column>
    <descope-grid-text-column header="Login IDs" path="externalIds" resizable="true" sortable="false"></descope-grid-text-column>
    <descope-grid-text-column header="Remote Address" path="remoteAddress" resizable="true" sortable="false"></descope-grid-text-column>
    <descope-grid-custom-column header="Type" path="type" resizable="true" sortable="false">
      <descope-badge bordered="true" data-pattern="info" mode="primary" size="xs" st-text-transform="capitalize"></descope-badge>
      <descope-badge bordered="true" data-pattern="warn" mode="error" size="xs" st-text-transform="capitalize"></descope-badge>
      <descope-badge bordered="true" data-pattern="error" mode="error" size="xs" st-text-transform="capitalize"></descope-badge>
      <descope-badge bordered="true" data-pattern="unknown" mode="default" size="xs" st-text-transform="capitalize"></descope-badge>
    </descope-grid-custom-column>
    <descope-grid-text-column header="Action" path="action" resizable="true" sortable="false"></descope-grid-text-column>
  </descope-grid>
</descope-container>
`;
