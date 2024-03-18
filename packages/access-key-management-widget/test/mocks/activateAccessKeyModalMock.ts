export default `
<descope-container border-radius="sm" data-editor-type="container" direction="column" id="ROOT" space-between="md" st-horizontal-padding="0rem" st-vertical-padding="0rem" st-align-items="start" st-justify-content="safe center" st-background-color="#80808000" st-host-width="100%" st-gap="1rem">
  <descope-text full-width="false" id="titleText" italic="false" mode="primary" text-align="center" variant="subtitle1">Activate Access Keys</descope-text>
  <descope-text data-id="body-text" full-width="false" id="bodyText" italic="false" mode="primary" text-align="center" variant="body1"></descope-text>
  <descope-container data-editor-type="container" direction="row" id="buttonsContainer" st-horizontal-padding="0rem" st-vertical-padding="0rem" st-align-items="start" st-justify-content="flex-end" st-background-color="#ffffff00" st-host-width="100%" st-gap="0.5rem">
    <descope-button data-id="modal-cancel" data-testid="activate-access-keys-modal-cancel" data-type="button" formNoValidate="false" full-width="false" id="activateAccessKeyCancelButton" shape="" size="sm" variant="outline" mode="primary" square="false">Cancel</descope-button>
    <descope-button data-id="modal-submit" data-testid="activate-access-keys-modal-submit" data-type="button" formNoValidate="false" full-width="false" id="activateAccessKeySubmitButton" shape="" size="sm" variant="contained" mode="primary" square="false">Activate</descope-button>
  </descope-container>
</descope-container>
`;
