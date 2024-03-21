export default `
<descope-container data-editor-type="container" direction="column" id="ROOT" space-between="md" st-horizontal-padding="0rem" st-vertical-padding="0rem" st-align-items="start" st-justify-content="safe center" st-background-color="#80808000" st-host-width="100%" st-gap="0.5rem">
  <descope-text full-width="false" id="titleText" italic="false" mode="primary" text-align="center" variant="subtitle2">Password was generated</descope-text>
  <descope-text full-width="false" id="subtitleText" italic="false" mode="primary" text-align="center" variant="body1">Make sure to copy it now, since it won't be available again in the future.</descope-text>
  <descope-text full-width="false" id="bodyText" italic="false" mode="primary" text-align="center" variant="body1">New temporary password is:</descope-text>
  <descope-text-field bordered="true" full-width="true" id="generated-password" label="Generated password" max="100" name="generated-password" placeholder="Generated Password" required="true" size="sm" readonly></descope-text-field>
  <descope-container data-editor-type="container" direction="row" id="buttonsContainer" st-horizontal-padding="0rem" st-vertical-padding="0rem" st-align-items="start" st-justify-content="flex-end" st-background-color="#ffffff00" st-host-width="100%" st-gap="0.5rem">
    <descope-button data-id="modal-close" data-testid="generated-password-modal-close" data-type="button" formNoValidate="false" full-width="false" id="generatedPasswrodCancelButton" shape="" size="sm" variant="contained" mode="primary" square="false">Copy to clipboard & close</descope-button>
  </descope-container>
</descope-container>
`;
