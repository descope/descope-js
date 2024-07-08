export default `
<descope-container border-radius="sm" data-editor-type="container" direction="column" id="ROOT" space-between="md" st-horizontal-padding="0rem" st-vertical-padding="0rem" st-align-items="start" st-justify-content="safe center" st-background-color="#80808000" st-host-width="100%" st-gap="0.5rem">
  <descope-text full-width="false" id="titleText" italic="false" mode="primary" text-align="center" variant="subtitle2">Delete users</descope-text>
  <descope-text data-id="body-text" full-width="false" id="bodyText" italic="false" mode="primary" text-align="center" variant="body1"></descope-text>
  <descope-container data-editor-type="container" direction="row" id="buttonsContainer" st-horizontal-padding="0rem" st-vertical-padding="0rem" st-align-items="start" st-justify-content="flex-end" st-background-color="#ffffff00" st-host-width="100%" st-gap="0rem">
    <descope-button data-id="modal-cancel" data-testid="delete-users-modal-cancel" data-type="button" formNoValidate="false" full-width="false" id="deleteUserCancelButton" shape="" size="xs" variant="link" mode="primary" square="false">Cancel</descope-button>
    <descope-button data-id="modal-submit" data-testid="delete-users-modal-submit" data-type="button" formNoValidate="false" full-width="false" id="deleteUserSubmitButton" shape="" size="xs" variant="contained" mode="error" square="false">Delete</descope-button>
  </descope-container>
</descope-container>

`;
