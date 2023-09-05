// eslint-disable-next-line import/prefer-default-export
export const generateSdkResponse = ({
  ok = true,
  stepId = '0',
  stepName = 'Step Name',
  screenId = '0',
  redirectUrl = '',
  screenState = {},
  action = 'screen',
  executionId = '0',
  status = 'running',
  requestErrorMessage = '',
  requestErrorDescription = '',
  webAuthnTransactionId = '',
  webAuthnOptions = '',
  samlIdpResponseUrl = '',
  samlIdpResponseSamlResponse = '',
  samlIdpResponseRelayState = '',
} = {}) => ({
  ok,
  data: {
    stepId,
    stepName,
    action,
    screen: { id: screenId, state: screenState },
    redirect: { url: redirectUrl },
    executionId,
    status,
    authInfo: 'auth info',
    webauthn: {
      options: webAuthnOptions,
      transactionId: webAuthnTransactionId,
    },
    samlIdpResponse: {
      url: samlIdpResponseUrl,
      samlResponse: samlIdpResponseSamlResponse,
      relayState: samlIdpResponseRelayState,
    },
  },
  error: {
    errorMessage: requestErrorMessage,
    errorDescription: requestErrorDescription,
  },
});
