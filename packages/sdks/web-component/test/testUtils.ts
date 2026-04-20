import { fireEvent } from '@testing-library/dom';

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
  requestErrorCode = '',
  webAuthnTransactionId = '',
  webAuthnOptions = '',
  samlIdpResponseUrl = '',
  samlIdpResponseSamlResponse = '',
  samlIdpResponseRelayState = '',
  wsFedIdpResponseUrl = '',
  wsFedIdpResponseWresult = '',
  wsFedIdpResponseWctx = '',
  lastAuth = {},
  openInNewTabUrl = '',
  nativeResponseType = '',
  nativeResponsePayload = {},
  output = {},
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
    authInfo: { refreshJwt: 'refreshJwt' },
    webauthn: {
      options: webAuthnOptions,
      transactionId: webAuthnTransactionId,
    },
    samlIdpResponse: samlIdpResponseUrl
      ? {
          url: samlIdpResponseUrl,
          samlResponse: samlIdpResponseSamlResponse,
          relayState: samlIdpResponseRelayState,
        }
      : undefined,
    wsFedIdpResponse: wsFedIdpResponseUrl
      ? {
          url: wsFedIdpResponseUrl,
          wresult: wsFedIdpResponseWresult,
          wctx: wsFedIdpResponseWctx,
        }
      : undefined,
    lastAuth,
    openInNewTabUrl,
    nativeResponse: {
      type: nativeResponseType,
      payload: nativeResponsePayload,
    },
    output,
  },
  error: {
    errorMessage: requestErrorMessage,
    errorDescription: requestErrorDescription,
    errorCode: requestErrorCode,
  },
});

export const invokeScriptOnload = () => {
  const origAppend = document.body.append;

  const spyAppend = jest.spyOn(document.body, 'append');
  spyAppend.mockImplementation((ele: any) => {
    setTimeout(() => {
      if (ele.localName === 'script') {
        fireEvent(ele, new Event('load'));
      }
    });
    origAppend.bind(document.body)(ele);
  });
};
