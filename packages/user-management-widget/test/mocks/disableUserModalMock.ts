export default `<descope-container data-editor-type="container" direction="column" id="ROOT" space-between="md" border-radius="sm" st-horizontal-padding="0rem" st-vertical-padding="0rem" st-align-items="start" st-justify-content="safe center" st-background-color="#80808000" st-host-width="100%" st-gap="0.5rem">
    <descope-text full-width="false" id="titleText" italic="false" mode="primary" text-align="center" variant="subtitle2">Disable user</descope-text>
    <descope-container data-editor-type="container" direction="column" id="ROOT" space-between="md" border-radius="sm" st-horizontal-padding="0rem" st-vertical-padding="0rem" st-align-items="start" st-justify-content="safe center" st-background-color="#80808000" st-host-width="100%" st-gap="0rem">
      <descope-text full-width="false" id="bodyText" italic="false" mode="primary" text-align="center" variant="body1" data-id="body-text"></descope-text>
      <descope-text full-width="false" id="bodyText2" italic="false" mode="primary" text-align="center" variant="body1" data-id="body-text">This will not affect users with the status "Invited".</descope-text>
    </descope-container>
    <descope-container data-editor-type="container" direction="row" id="buttonsContainer" st-horizontal-padding="0rem" st-vertical-padding="0rem" st-align-items="start" st-justify-content="flex-end" st-background-color="#ffffff00" st-host-width="100%" st-gap="0.5rem">
        <descope-button data-type="button" formnovalidate="false" full-width="false" id="disableUserCancelButton" shape="" size="sm" variant="outline" data-testid="disable-user-modal-cancel" data-id="modal-cancel" mode="primary" square="false">Cancel</descope-button>
        <descope-button data-type="button" formnovalidate="false" full-width="false" id="disableUserSubmitButton" shape="" size="sm" variant="contained" data-testid="disable-user-modal-submit" data-id="modal-submit" mode="primary" square="false">Disable</descope-button>
    </descope-container>
</descope-container>`;
