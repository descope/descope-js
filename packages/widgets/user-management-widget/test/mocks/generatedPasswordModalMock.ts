export default `
<descope-container data-editor-type="container" direction="column" id="ROOT" space-between="md" st-horizontal-padding="0rem" st-vertical-padding="0rem" st-align-items="start" st-justify-content="safe center" st-background-color="#80808000" st-host-width="100%" st-gap="0.5rem">
  <descope-text full-width="false" id="titleText" italic="false" mode="primary" text-align="center" variant="subtitle2">User's password reset</descope-text>
  <descope-text full-width="false" id="subtitleText" italic="false" mode="primary" text-align="center" variant="body1">Make sure to copy it now, since it won't be available again in the future.</descope-text>
  <descope-text full-width="false" id="bodyText" italic="false" mode="primary" text-align="center" variant="body1">The user's new temporary password is:</descope-text>
  <descope-text-field bordered="true" full-width="true" id="generated-password" label="" max="100" name="generated-password" placeholder="Generated password" required="true" size="sm" readonly data-testid="generated-password-key-input"></descope-text-field>
  <descope-container data-editor-type="container" direction="row" id="buttonsContainer" st-horizontal-padding="0rem" st-vertical-padding="0rem" st-align-items="start" st-justify-content="flex-end" st-background-color="#ffffff00" st-host-width="100%" st-gap="0rem">
    <descope-button data-id="modal-close" data-testid="generated-password-modal-close" data-type="button" formNoValidate="false" full-width="false" id="generatedPasswordCancelButton" shape="" size="xs" variant="contained" mode="primary" square="false">Copy to clipboard & close</descope-button>
  </descope-container>
</descope-container>
`;
