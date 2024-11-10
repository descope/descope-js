import {
  ensureFingerprintIds,
  clearFingerprintData,
} from '@descope/web-js-sdk';
import {
  CUSTOM_INTERACTIONS,
  DESCOPE_ATTRIBUTE_EXCLUDE_FIELD,
  DESCOPE_ATTRIBUTE_EXCLUDE_NEXT_BUTTON,
  ELEMENT_TYPE_ATTRIBUTE,
  FETCH_ERROR_RESPONSE_ERROR_CODE,
  FETCH_EXCEPTION_ERROR_CODE,
  RESPONSE_ACTIONS,
} from '../constants';
import {
  fetchContent,
  getAnimationDirection,
  getContentUrl,
  getElementDescopeAttributes,
  handleAutoFocus,
  injectSamlIdpForm,
  isConditionalLoginSupported,
  updateScreenFromScreenState,
  updateTemplateFromScreenState,
  setTOTPVariable,
  showFirstScreenOnExecutionInit,
  State,
  submitForm,
  withMemCache,
  getFirstNonEmptyValue,
  leadingDebounce,
  handleReportValidityOnBlur,
  getUserLocale,
  clearPreviousExternalInputs,
  timeoutPromise,
} from '../helpers';
import { calculateConditions, calculateCondition } from '../helpers/conditions';
import { getLastAuth, setLastAuth } from '../helpers/lastAuth';
import { getABTestingKey } from '../helpers/abTestingKey';
import { IsChanged } from '../helpers/state';
import {
  disableWebauthnButtons,
  setNOTPVariable,
  setPhoneAutoDetectDefaultCode,
} from '../helpers/templates';
import {
  Direction,
  FlowState,
  NextFn,
  NextFnReturnPromiseValue,
  SdkConfig,
  StepState,
} from '../types';
import BaseDescopeWc from './BaseDescopeWc';
import loadSdkScript, { getScriptResultPath } from './sdkScripts';

// this class is responsible for WC flow execution
class DescopeWc extends BaseDescopeWc {
  errorTransformer:
    | ((error: { text: string; type: string }) => string)
    | undefined;

  static set sdkConfigOverrides(config: Partial<SdkConfig>) {
    BaseDescopeWc.sdkConfigOverrides = config;
  }

  flowState: State<FlowState>;

  stepState = new State<StepState>({} as StepState, {
    updateOnlyOnChange: false,
  });

  #pollingTimeout: NodeJS.Timeout;

  #conditionalUiAbortController = null;

  constructor() {
    const flowState = new State<FlowState>({
      deferredRedirect: false,
    } as FlowState);

    super(flowState.update.bind(flowState));

    this.flowState = flowState;
  }

  #eventsCbRefs = {
    visibilitychange: this.#syncStateWithVisibility.bind(this),
  };

  #syncStateWithVisibility() {
    if (!document.hidden) {
      // Defer the update a bit, it won't work otherwise
      setTimeout(() => {
        // Trigger state update that will redirect and pending deferred redirection
        this.flowState.update({ deferredRedirect: false });
      }, 300);
    }
  }

  // Native bridge version native / web syncing - change this when
  // a major change happens that requires some form of compatibility
  bridgeVersion = 1;

  // This callback will be initialized once a 'nativeBridge' action is
  // received from a start or next request. It will then be called by
  // the native layer as a response to a dispatched 'bridge' event.
  nativeComplete: (bridgeResponse: string) => Promise<void>;

  // This object is set by the native layer to
  // inject native specific data into the 'flowState'.
  nativeOptions:
    | {
        platform: 'ios' | 'android';
        oauthProvider?: string;
        oauthRedirect?: string;
        magicLinkRedirect?: string;
        ssoRedirect?: string;
        origin?: string;
      }
    | undefined;

  async loadSdkScripts() {
    const flowConfig = await this.getFlowConfig();
    const scripts = flowConfig.sdkScripts;

    scripts?.forEach(async (script) => {
      const module = await loadSdkScript(script.id);
      module(
        script.initArgs as any,
        { baseUrl: this.baseUrl },
        (result: string) => {
          // update the context with the result, under the `resultKey` key
          this.dispatchEvent(
            new CustomEvent('components-context', {
              detail: {
                // we store the result with script.id prefix to avoid conflicts with other scripts results
                // that may have the same key
                [getScriptResultPath(script.id, script.resultKey)]: result,
              },
              bubbles: true,
              composed: true,
            }),
          );
        },
      );
    });
  }

  async init() {
    if (this.shadowRoot.isConnected) {
      this.flowState?.subscribe(this.onFlowChange.bind(this));
      this.stepState?.subscribe(this.onStepChange.bind(this));

      window.addEventListener(
        'visibilitychange',
        this.#eventsCbRefs.visibilitychange,
      );
    }
    await super.init?.();
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    this.flowState.unsubscribeAll();
    this.stepState.unsubscribeAll();

    this.#conditionalUiAbortController?.abort();
    this.#conditionalUiAbortController = null;

    window.removeEventListener(
      'visibilitychange',
      this.#eventsCbRefs.visibilitychange,
    );
  }

  async getHtmlFilenameWithLocale(locale: string, screenId: string) {
    let filenameWithLocale: string;
    const userLocale = getUserLocale(locale); // use provided locals, otherwise use browser locale
    const targetLocales = await this.getTargetLocales();

    if (targetLocales.includes(userLocale.locale)) {
      filenameWithLocale = `${screenId}-${userLocale.locale}.html`;
    } else if (targetLocales.includes(userLocale.fallback)) {
      filenameWithLocale = `${screenId}-${userLocale.fallback}.html`;
    }
    return filenameWithLocale;
  }

  async getPageContent(htmlUrl: string, htmlLocaleUrl: string) {
    if (htmlLocaleUrl) {
      // try first locale url, if can't get for some reason, fallback to the original html url (the one without locale)
      try {
        const { body } = await fetchContent(htmlLocaleUrl, 'text');
        return body;
      } catch (ex) {
        this.loggerWrapper.error(
          `Failed to fetch flow page from ${htmlLocaleUrl}. Fallback to url ${htmlUrl}`,
          ex,
        );
      }
    }

    try {
      const { body } = await fetchContent(htmlUrl, 'text');
      return body;
    } catch (ex) {
      this.loggerWrapper.error(`Failed to fetch flow page`, ex.message);
    }
    return null;
  }

  async #handleFlowRestart() {
    this.loggerWrapper.debug('Trying to restart the flow');
    const prevCompVersion = await this.getComponentsVersion();
    this.getConfig.reset();
    const compVersion = await this.getComponentsVersion();

    if (prevCompVersion === compVersion) {
      this.loggerWrapper.debug(
        'Components version was not changed, restarting flow',
      );
      this.flowState.update({
        stepId: null,
        executionId: null,
      });
    } else {
      this.loggerWrapper.error(
        'Components version mismatch, please reload the page',
      );
    }
  }

  async onFlowChange(
    currentState: FlowState,
    prevState: FlowState,
    isChanged: IsChanged<FlowState>,
  ) {
    const {
      projectId,
      flowId,
      tenant,
      stepId,
      executionId,
      action,
      screenId,
      screenState,
      redirectTo,
      openInNewTabUrl,
      redirectUrl,
      token,
      code,
      exchangeError,
      webauthnTransactionId,
      webauthnOptions,
      redirectAuthCodeChallenge,
      redirectAuthCallbackUrl,
      redirectAuthBackupCallbackUri,
      redirectAuthInitiator,
      locale,
      samlIdpResponseUrl,
      samlIdpResponseSamlResponse,
      samlIdpResponseRelayState,
      nativeResponseType,
      nativePayload,
      ...ssoQueryParams
    } = currentState;

    let startScreenId: string;
    let conditionInteractionId: string;
    const abTestingKey = getABTestingKey();
    const loginId = this.sdk.getLastUserLoginId();
    const flowConfig = await this.getFlowConfig();
    const projectConfig = await this.getProjectConfig();
    const flowVersions = Object.entries(projectConfig.flows || {}).reduce(
      // pass also current versions for all flows, it may be used as a part of the current flow
      (acc, [key, value]) => {
        acc[key] = value.version;
        return acc;
      },
      {} as Record<string, number>,
    );
    const redirectAuth =
      redirectAuthCallbackUrl && redirectAuthCodeChallenge
        ? {
            callbackUrl: redirectAuthCallbackUrl,
            codeChallenge: redirectAuthCodeChallenge,
            backupCallbackUri: redirectAuthBackupCallbackUri,
          }
        : undefined;
    const nativeOptions = this.nativeOptions
      ? {
          platform: this.nativeOptions.platform,
          oauthProvider: this.nativeOptions.oauthProvider,
          oauthRedirect: this.nativeOptions.oauthRedirect,
          magicLinkRedirect: this.nativeOptions.magicLinkRedirect,
          ssoRedirect: this.nativeOptions.ssoRedirect,
        }
      : undefined;

    // if there is no execution id we should start a new flow
    if (!executionId) {
      this.loadSdkScripts();
      if (flowConfig.fingerprintEnabled && flowConfig.fingerprintKey) {
        await ensureFingerprintIds(flowConfig.fingerprintKey, this.baseUrl);
      } else {
        clearFingerprintData();
      }

      if (flowConfig.conditions) {
        ({ startScreenId, conditionInteractionId } = calculateConditions(
          { loginId, code, token, abTestingKey },
          flowConfig.conditions,
        ));
      } else if (flowConfig.condition) {
        ({ startScreenId, conditionInteractionId } = calculateCondition(
          flowConfig.condition,
          {
            loginId,
            code,
            token,
            abTestingKey,
          },
        ));
      } else {
        startScreenId = flowConfig.startScreenId;
      }

      // As an optimization - we want to show the first screen if it is possible
      if (!showFirstScreenOnExecutionInit(startScreenId, ssoQueryParams)) {
        const sdkResp = await this.sdk.flow.start(
          flowId,
          {
            tenant,
            redirectAuth,
            ...ssoQueryParams,
            client: this.client,
            ...(redirectUrl && { redirectUrl }),
            lastAuth: getLastAuth(loginId),
            abTestingKey,
            locale: getUserLocale(locale).locale,
            nativeOptions,
          },
          conditionInteractionId,
          '',
          projectConfig.componentsVersion,
          flowVersions,
          {
            ...this.formConfigValues,
            ...(code ? { exchangeCode: code, idpInitiated: true } : {}),
            ...(ssoQueryParams.descopeIdpInitiated && { idpInitiated: true }),
            ...(token ? { token } : {}),
            ...(ssoQueryParams.oidcLoginHint
              ? { externalId: ssoQueryParams.oidcLoginHint }
              : {}),
          },
        );

        this.#handleSdkResponse(sdkResp);
        if (sdkResp?.data?.status !== 'completed') {
          this.flowState.update({ code: undefined, token: undefined });
        }
        return;
      }
    }

    // if there is a descope url param on the url its because the user clicked on email link or redirected back to the app
    // we should call next with the params
    if (
      executionId &&
      ((isChanged('token') && token) ||
        (isChanged('code') && code) ||
        (isChanged('exchangeError') && exchangeError))
    ) {
      const sdkResp = await this.sdk.flow.next(
        executionId,
        stepId,
        CUSTOM_INTERACTIONS.submit,
        flowConfig.version,
        projectConfig.componentsVersion,
        {
          token,
          exchangeCode: code,
          exchangeError,
        },
      );
      this.#handleSdkResponse(sdkResp);
      this.flowState.update({
        token: undefined,
        code: undefined,
        exchangeError: undefined,
      }); // should happen after handleSdkResponse, otherwise we will not have screen id on the next run
      return;
    }

    const samlProps = [
      'samlIdpResponseUrl',
      'samlIdpResponseSamlResponse',
      'samlIdpResponseRelayState',
    ];
    if (
      action === RESPONSE_ACTIONS.loadForm &&
      samlProps.some((samlProp) => isChanged(samlProp))
    ) {
      if (!samlIdpResponseUrl || !samlIdpResponseSamlResponse) {
        this.loggerWrapper.error('Did not get saml idp params data to load');
        return;
      }

      // Handle SAML IDP end of flow ("redirect like" by using html form with hidden params)
      injectSamlIdpForm(
        samlIdpResponseUrl,
        samlIdpResponseSamlResponse,
        samlIdpResponseRelayState || '',
        submitForm,
      ); // will redirect us to the saml acs url
    }

    if (
      action === RESPONSE_ACTIONS.redirect &&
      (isChanged('redirectTo') || isChanged('deferredRedirect'))
    ) {
      if (!redirectTo) {
        this.loggerWrapper.error('Did not get redirect url');
        return;
      }
      if (redirectAuthInitiator === 'android' && document.hidden) {
        // on android native flows, defer redirects until in foreground
        this.flowState.update({
          deferredRedirect: true,
        });
        return;
      }
      window.location.assign(redirectTo);
      return;
    }

    if (
      action === RESPONSE_ACTIONS.webauthnCreate ||
      action === RESPONSE_ACTIONS.webauthnGet
    ) {
      if (!webauthnTransactionId || !webauthnOptions) {
        this.loggerWrapper.error(
          'Did not get webauthn transaction id or options',
        );
        return;
      }

      this.#conditionalUiAbortController?.abort();
      this.#conditionalUiAbortController = null;

      let response: string;
      let failure: string;

      try {
        response =
          action === RESPONSE_ACTIONS.webauthnCreate
            ? await this.sdk.webauthn.helpers.create(webauthnOptions)
            : await this.sdk.webauthn.helpers.get(webauthnOptions);
      } catch (e) {
        if (e.name === 'InvalidStateError') {
          // currently returned in Chrome when trying to register a WebAuthn device
          // that's already registered for the user
          this.loggerWrapper.warn('WebAuthn operation failed', e.message);
        } else if (e.name !== 'NotAllowedError') {
          // shouldn't happen in normal usage ('AbortError' is only when setting an AbortController)
          this.loggerWrapper.error(e.message);
        }
        failure = e.name;
      }
      // Call next with the transactionId and the response or failure
      const sdkResp = await this.sdk.flow.next(
        executionId,
        stepId,
        CUSTOM_INTERACTIONS.submit,
        flowConfig.version,
        projectConfig.componentsVersion,
        {
          transactionId: webauthnTransactionId,
          response,
          failure,
        },
      );
      this.#handleSdkResponse(sdkResp);
    }

    if (action === RESPONSE_ACTIONS.nativeBridge) {
      // prepare a callback with the current flow state, and accept
      // the input to be a JSON, passed down from the native layer.
      // this function will be called as an async response to a 'bridge' event
      this.nativeComplete = async (bridgeResponse: string) => {
        const input = JSON.parse(bridgeResponse);
        const sdkResp = await this.sdk.flow.next(
          executionId,
          stepId,
          CUSTOM_INTERACTIONS.submit,
          flowConfig.version,
          projectConfig.componentsVersion,
          input,
        );
        this.#handleSdkResponse(sdkResp);
      };
      // notify the bridging native layer that a native action is requested via 'bridge' event.
      // the response will be in the form of calling the `nativeComplete` callback
      this.#dispatch('bridge', {
        type: nativeResponseType,
        payload: nativePayload,
      });
      return;
    }

    this.#handlePollingResponse(
      executionId,
      stepId,
      action,
      flowConfig.version,
      projectConfig.componentsVersion,
    );

    // if there is no screen id (possibly due to page refresh or no screen flow) we should get it from the server
    if (!screenId && !startScreenId) {
      this.loggerWrapper.warn('No screen was found to show');
      return;
    }

    const readyScreenId = startScreenId || screenId;

    // get the right filename according to the user locale and flow target locales
    const filenameWithLocale: string = await this.getHtmlFilenameWithLocale(
      locale,
      readyScreenId,
    );

    const { oidcLoginHint, oidcPrompt, oidcErrorRedirectUri, samlIdpUsername } =
      ssoQueryParams;

    // generate step state update data
    const stepStateUpdate: Partial<StepState> = {
      direction: getAnimationDirection(stepId, prevState.stepId),
      screenState: {
        ...screenState,
        form: {
          ...this.formConfigValues,
          ...screenState?.form,
        },
        lastAuth: {
          loginId,
          name: this.sdk.getLastUserDisplayName() || loginId,
        },
      },
      htmlUrl: getContentUrl({
        projectId,
        filename: `${readyScreenId}.html`,
        baseUrl: this.baseStaticUrl,
      }),
      htmlLocaleUrl:
        filenameWithLocale &&
        getContentUrl({
          projectId,
          filename: filenameWithLocale,
          baseUrl: this.baseStaticUrl,
        }),
      samlIdpUsername,
      oidcLoginHint,
      oidcPrompt,
      oidcErrorRedirectUri,
      openInNewTabUrl,
    };

    const lastAuth = getLastAuth(loginId);

    // If there is a start screen id, next action should start the flow
    // But if any of the sso params are not empty, this optimization doesn't happen
    // because Descope may decide not to show the first screen (in cases like a user is already logged in) - this is more relevant for SSO scenarios
    if (showFirstScreenOnExecutionInit(startScreenId, ssoQueryParams)) {
      stepStateUpdate.next = (
        interactionId,
        version,
        componentsVersion,
        inputs,
      ) =>
        this.sdk.flow.start(
          flowId,
          {
            tenant,
            redirectAuth,
            ...ssoQueryParams,
            lastAuth,
            preview: this.preview,
            abTestingKey,
            client: this.client,
            ...(redirectUrl && { redirectUrl }),
            locale: getUserLocale(locale).locale,
            nativeOptions,
          },
          conditionInteractionId,
          interactionId,
          componentsVersion,
          flowVersions,
          {
            ...this.formConfigValues,
            ...inputs,
            ...(code && { exchangeCode: code, idpInitiated: true }),
            ...(ssoQueryParams.descopeIdpInitiated && { idpInitiated: true }),
            ...(token && { token }),
          },
        );
    } else if (
      isChanged('projectId') ||
      isChanged('baseUrl') ||
      isChanged('executionId') ||
      isChanged('stepId')
    ) {
      stepStateUpdate.next = (...args) =>
        this.sdk.flow.next(executionId, stepId, ...args);
    }

    // update step state
    this.stepState.update(stepStateUpdate);
  }

  #handlePollingResponse = (
    executionId: string,
    stepId: string,
    action: string,
    flowVersion: number,
    componentsVersion: string,
    rescheduled: boolean = false,
  ) => {
    const pollingDefaultDelay = 2000;
    const pollingDefaultTimeout = 6000;
    const pollingThrottleDelay = 500;
    const pollingThrottleThreshold = 500;
    const pollingThrottleTimeout = 1000;
    if (action === RESPONSE_ACTIONS.poll) {
      // schedule next polling request for 2 seconds from now
      this.logger.debug('polling - Scheduling polling request');
      const scheduledAt = Date.now();
      const delay = rescheduled ? pollingThrottleDelay : pollingDefaultDelay;
      this.#pollingTimeout = setTimeout(async () => {
        this.logger.debug('polling - Calling next');

        const nextCall = this.sdk.flow.next(
          executionId,
          stepId,
          CUSTOM_INTERACTIONS.polling,
          flowVersion,
          componentsVersion,
          {},
        );

        // Try to detect whether the tab is being throttled when running in a mobile browser, specifically on iOS.
        // We check whether the tab seems to hidden and the polling callback was called much later than expected,
        // in which case we allow a much shorter timeout for the polling request. The reschedule check ensures
        // this cannot happen twice consecutively.
        const throttled =
          document.hidden &&
          !rescheduled &&
          Date.now() - scheduledAt > delay + pollingThrottleThreshold;
        if (throttled) {
          this.logger.debug('polling - The polling seems to be throttled');
        }

        let sdkResp: Awaited<typeof nextCall>;
        try {
          const timeout = throttled
            ? pollingThrottleTimeout
            : pollingDefaultTimeout;
          sdkResp = await timeoutPromise(timeout, nextCall);
        } catch (err) {
          this.logger.warn(
            `polling - The ${
              throttled ? 'throttled fetch' : 'fetch'
            } call timed out or was aborted`,
          );
          this.#handlePollingResponse(
            executionId,
            stepId,
            action,
            flowVersion,
            componentsVersion,
            throttled,
          );
          return;
        }

        if (sdkResp?.error?.errorCode === FETCH_EXCEPTION_ERROR_CODE) {
          this.logger.debug(
            'polling - Got a generic error due to exception in fetch call',
          );
          this.#handlePollingResponse(
            executionId,
            stepId,
            action,
            flowVersion,
            componentsVersion,
          );
          return;
        }

        this.logger.debug('polling - Got a response');
        if (sdkResp?.error) {
          this.logger.debug(
            'polling - Response has an error',
            JSON.stringify(sdkResp.error, null, 4),
          );
        }

        this.#handleSdkResponse(sdkResp);
        const { action: nextAction } = sdkResp?.data ?? {};
        // will poll again if needed
        this.#handlePollingResponse(
          executionId,
          stepId,
          nextAction,
          flowVersion,
          componentsVersion,
        );
      }, delay);
    }
  };

  #resetPollingTimeout = () => {
    clearTimeout(this.#pollingTimeout);
    this.#pollingTimeout = null;
  };

  #handleSdkResponse = (sdkResp: NextFnReturnPromiseValue) => {
    if (!sdkResp?.ok) {
      const defaultMessage = sdkResp?.response?.url;
      const defaultDescription = `${sdkResp?.response?.status} - ${sdkResp?.response?.statusText}`;

      this.#dispatch(
        'error',
        sdkResp?.error || {
          errorCode: FETCH_ERROR_RESPONSE_ERROR_CODE,
          errorDescription: defaultDescription,
          errorMessage: defaultMessage,
        },
      );

      this.loggerWrapper.error(
        sdkResp?.error?.errorDescription || defaultMessage,
        sdkResp?.error?.errorMessage || defaultDescription,
      );

      // E102004 = Flow requested is in old version
      // E103205 = Flow timed out
      const errorCode = sdkResp?.error?.errorCode;
      if (
        (errorCode === 'E102004' || errorCode === 'E103205') &&
        this.isRestartOnError
      ) {
        this.#handleFlowRestart();
      }
      return;
    }

    sdkResp.data?.runnerLogs?.forEach((l) => {
      const { level, title, log } = l;
      if (level && this.loggerWrapper[level]) {
        this.loggerWrapper[level](title, log);
      } else {
        this.loggerWrapper.info(title, log);
      }
    });
    const errorText = sdkResp.data?.screen?.state?.errorText;
    if (sdkResp.data?.error) {
      this.loggerWrapper.error(
        `[${sdkResp.data.error.code}]: ${sdkResp.data.error.description}`,
        `${errorText ? `${errorText} - ` : ''}${sdkResp.data.error.message}`,
      );
    } else if (errorText) {
      this.loggerWrapper.error(errorText);
    }

    const { status, authInfo, lastAuth } = sdkResp.data;

    if (status === 'completed') {
      if (this.storeLastAuthenticatedUser) {
        setLastAuth(lastAuth);
      }
      this.#dispatch('success', authInfo);
      return;
    }

    const {
      executionId,
      stepId,
      stepName,
      action,
      screen,
      redirect,
      openInNewTabUrl,
      webauthn,
      error,
      samlIdpResponse,
      nativeResponse,
    } = sdkResp.data;

    if (action === RESPONSE_ACTIONS.poll) {
      // We only update action because the polling response action does not return extra information
      this.flowState.update({
        action,
      });
      return;
    }

    this.loggerWrapper.info(
      `Step "${stepName || `#${stepId}`}" is ${status}`,
      '',
      {
        screen,
        status,
        stepId,
        stepName,
        action,
        error,
      },
    );

    this.flowState.update({
      stepId,
      executionId,
      action,
      redirectTo: redirect?.url,
      openInNewTabUrl,
      screenId: screen?.id,
      screenState: screen?.state,
      webauthnTransactionId: webauthn?.transactionId,
      webauthnOptions: webauthn?.options,
      samlIdpResponseUrl: samlIdpResponse?.url,
      samlIdpResponseSamlResponse: samlIdpResponse?.samlResponse,
      samlIdpResponseRelayState: samlIdpResponse?.relayState,
      nativeResponseType: nativeResponse?.type,
      nativePayload: nativeResponse?.payload,
    });
  };

  // we want to get the start params only if we don't have it already
  #getWebauthnConditionalUiStartParams = withMemCache(async () => {
    try {
      const startResp = await this.sdk.webauthn.signIn.start(
        '',
        window.location.origin,
      ); // when using conditional UI we need to call start without identifier
      if (!startResp.ok) {
        this.loggerWrapper.warn(
          'Webauthn start failed',
          startResp?.error?.errorMessage,
        );
      }
      return startResp.data;
    } catch (err) {
      this.loggerWrapper.warn('Webauthn start failed', err.message);
    }

    return undefined;
  });

  /**
   * this is needed because Conditional UI does not work on all input names
   * we need to add a prefix to the input name so it will trigger the autocomplete dialog
   * but we want to remove it once the user starts typing because we want this field to be sent to the server with the correct name
   */

  // eslint-disable-next-line class-methods-use-this
  #handleConditionalUiInput(inputEle: HTMLInputElement) {
    const ignoreList = ['email'];
    const origName = inputEle.getAttribute('name');

    if (!ignoreList.includes(origName)) {
      const conditionalUiSupportName = `user-${origName}`;

      // eslint-disable-next-line no-param-reassign
      inputEle.setAttribute('name', conditionalUiSupportName);

      inputEle.addEventListener('input', () => {
        // eslint-disable-next-line no-param-reassign
        inputEle.setAttribute(
          'name',
          inputEle.value ? origName : conditionalUiSupportName,
        );
      });
    }
  }

  async #handleWebauthnConditionalUi(fragment: DocumentFragment, next: NextFn) {
    this.#conditionalUiAbortController?.abort();

    const conditionalUiInput = fragment.querySelector(
      '*[autocomplete="webauthn"]',
    ) as HTMLInputElement;

    if (conditionalUiInput && (await isConditionalLoginSupported())) {
      const { options, transactionId } =
        (await this.#getWebauthnConditionalUiStartParams()) || {};

      if (options && transactionId) {
        this.#handleConditionalUiInput(conditionalUiInput);

        // we need the abort controller so we can cancel the current webauthn session in case the user clicked on a webauthn button, and we need to start a new session
        this.#conditionalUiAbortController = new AbortController();

        const flowConfig = await this.getFlowConfig();
        const projectConfig = await this.getProjectConfig();
        // we should not wait for this fn, it will call next when the user uses his passkey on the input
        this.sdk.webauthn.helpers
          .conditional(options, this.#conditionalUiAbortController)
          .then(async (response) => {
            const resp = await next(
              conditionalUiInput.id,
              flowConfig.version,
              projectConfig.componentsVersion,
              {
                transactionId,
                response,
              },
            );
            this.#handleSdkResponse(resp);
          })
          .catch((err) => {
            if (err.name !== 'AbortError') {
              this.loggerWrapper.error('Conditional login failed', err.message);
            }
          });
      }
    }
  }

  async onStepChange(currentState: StepState, prevState: StepState) {
    const {
      htmlUrl,
      htmlLocaleUrl,
      direction,
      next,
      screenState,
      openInNewTabUrl,
    } = currentState;

    const stepTemplate = document.createElement('template');
    stepTemplate.innerHTML = await this.getPageContent(htmlUrl, htmlLocaleUrl);

    const clone = stepTemplate.content.cloneNode(true) as DocumentFragment;

    const loadDescopeUiComponents = this.loadDescopeUiComponents(stepTemplate);

    // we want to disable the webauthn buttons if it's not supported on the browser
    if (!this.sdk.webauthn.helpers.isSupported()) {
      disableWebauthnButtons(clone);
    } else {
      await this.#handleWebauthnConditionalUi(clone, next);
    }

    if (
      currentState.samlIdpUsername &&
      !screenState.form?.loginId &&
      !screenState.form?.email
    ) {
      if (!screenState.form) {
        screenState.form = {};
      }
      screenState.form.loginId = currentState.samlIdpUsername;
      screenState.form.email = currentState.samlIdpUsername;
    }

    updateTemplateFromScreenState(
      clone,
      screenState,
      screenState.componentsConfig,
      this.formConfig,
      this.errorTransformer,
      this.loggerWrapper,
    );

    // set the default country code based on the locale value we got
    const { geo } = await this.getExecutionContext();
    setPhoneAutoDetectDefaultCode(clone, geo);

    const injectNextPage = async () => {
      await loadDescopeUiComponents;

      // put the totp and notp variable on the root element, which is the top level 'div' inside the shadowroot
      const rootElement = this.shadowRoot.querySelector('div');
      setTOTPVariable(rootElement, screenState?.totp?.image);

      setNOTPVariable(rootElement, screenState?.notp?.image);

      this.rootElement.replaceChildren(clone);

      // If before html url was empty, we deduce its the first time a screen is shown
      const isFirstScreen = !prevState.htmlUrl;

      // we need to wait for all components to render before we can set its value
      setTimeout(() => {
        this.#updateExternalInputs();

        handleAutoFocus(this.rootElement, this.autoFocus, isFirstScreen);

        if (this.validateOnBlur) {
          handleReportValidityOnBlur(this.rootElement);
        }

        // we need to wait for all components to render before we can set its value
        updateScreenFromScreenState(this.rootElement, screenState);
      });

      this.#hydrate(next);
      if (isFirstScreen) {
        // Dispatch when the first page is ready
        // So user can show a loader until his event is triggered
        this.#dispatch('ready', {});
      }
      this.#dispatch('page-updated', {});
      const loader = this.rootElement.querySelector(
        `[${ELEMENT_TYPE_ATTRIBUTE}="polling"]`,
      );
      if (loader) {
        const flowConfig = await this.getFlowConfig();
        const projectConfig = await this.getProjectConfig();
        // Loader component in the screen triggers polling interaction
        const response = await next(
          CUSTOM_INTERACTIONS.polling,
          flowConfig.version,
          projectConfig.componentsVersion,
          {},
        );
        this.#handleSdkResponse(response);
      }

      // open in a new tab should be done after the screen is rendered
      // because in some cases, the page will have a loader that
      // should run during the redirect process
      if (openInNewTabUrl && !prevState.openInNewTabUrl) {
        window.open(openInNewTabUrl, '_blank');
      }
    };

    // no animation
    if (!direction) {
      injectNextPage();
      return;
    }

    this.#handleAnimation(injectNextPage, direction);
  }

  #validateInputs() {
    let isValid = true;
    Array.from(this.shadowRoot.querySelectorAll('*[name]'))
      .reverse()
      .forEach((input: HTMLInputElement) => {
        if (input.localName === 'slot') {
          return;
        }
        input.reportValidity?.();
        if (isValid) {
          isValid = input.checkValidity?.();
        }
      });

    return isValid;
  }

  async #getFormData() {
    const inputs = Array.from(
      this.shadowRoot.querySelectorAll(
        `*[name]:not([${DESCOPE_ATTRIBUTE_EXCLUDE_FIELD}])`,
      ),
    ) as HTMLInputElement[];

    // wait for all inputs
    const values = await Promise.all(
      inputs.map(async (input) => ({
        name: input.getAttribute('name'),
        value: input.value,
      })),
    );

    // reduce to object
    return values.reduce(
      (acc, val) => ({
        ...acc,
        [val.name]: val.value,
      }),
      {},
    );
  }

  #handleSubmitButtonLoader(submitter: HTMLElement) {
    const unsubscribeNextRequestStatus = this.nextRequestStatus.subscribe(
      ({ isLoading }) => {
        if (isLoading) {
          submitter.setAttribute('loading', 'true');
        } else {
          this.nextRequestStatus.unsubscribe(unsubscribeNextRequestStatus);
          submitter.removeAttribute('loading');
        }
      },
    );
  }

  // handle storing passwords in password managers
  #handleStoreCredentials(formData = {}) {
    const idFields = ['externalId', 'email', 'phone'];
    const passwordFields = ['newPassword', 'password'];

    const id = getFirstNonEmptyValue(formData, idFields);
    const password = getFirstNonEmptyValue(formData, passwordFields);

    // PasswordCredential not supported in Firefox
    if (id && password) {
      try {
        if (!globalThis.PasswordCredential) {
          return;
        }
        const cred = new globalThis.PasswordCredential({ id, password });

        navigator?.credentials?.store?.(cred);
      } catch (e) {
        this.loggerWrapper.error('Could not store credentials', e.message);
      }
    }
  }

  #updateExternalInputs() {
    // we need to clear external inputs that were created previously, so each screen has only
    // the slotted inputs it needs
    clearPreviousExternalInputs();

    const eles = this.rootElement.querySelectorAll('[external-input="true"]');
    eles.forEach((ele) => this.#handleExternalInputs(ele));
  }

  #handleExternalInputs(ele: Element) {
    if (!ele) {
      return;
    }

    const origInputs = ele.querySelectorAll('input');

    origInputs.forEach((inp) => {
      const targetSlot = inp.getAttribute('slot');
      const id = `input-${ele.id}-${targetSlot}`;

      const slot = document.createElement('slot');
      slot.setAttribute('name', id);
      slot.setAttribute('slot', targetSlot);

      ele.appendChild(slot);

      inp.setAttribute('slot', id);
      this.appendChild(inp);
    });
  }

  // we are wrapping this function with a leading debounce,
  // to prevent a scenario where we are calling it multiple times
  // this can caused by focusing on a button and pressing enter
  // in this case, the button will be clicked, but because we have the auto-submit mechanism
  // it will submit the form once again and we will end up with 2 identical calls for next
  #handleSubmit = leadingDebounce(
    async (submitter: HTMLElement, next: NextFn) => {
      if (
        submitter.getAttribute('formnovalidate') === 'true' ||
        this.#validateInputs()
      ) {
        const submitterId = submitter?.getAttribute('id');
        this.#handleSubmitButtonLoader(submitter);

        const formData = await this.#getFormData();
        const eleDescopeAttrs = getElementDescopeAttributes(submitter);
        const contextArgs = this.getComponentsContext();

        const actionArgs = {
          ...contextArgs,
          ...eleDescopeAttrs,
          ...formData,
          // 'origin' is required to start webauthn. For now we'll add it to every request.
          // When running in a native flow in a Android app the webauthn authentication
          // is performed in the native app, so a custom origin needs to be injected
          // into the webauthn request data.
          origin: this.nativeOptions?.origin || window.location.origin,
        };

        const flowConfig = await this.getFlowConfig();
        const projectConfig = await this.getProjectConfig();
        const sdkResp = await next(
          submitterId,
          flowConfig.version,
          projectConfig.componentsVersion,
          actionArgs,
        );

        this.#handleSdkResponse(sdkResp);

        this.#handleStoreCredentials(formData);
      }
    },
  );

  #addPasscodeAutoSubmitListeners(next: NextFn) {
    this.rootElement
      .querySelectorAll(`descope-passcode[data-auto-submit="true"]`)
      .forEach((passcode: HTMLInputElement) => {
        passcode.addEventListener('input', () => {
          const isValid = passcode.checkValidity?.();
          if (isValid) {
            this.#handleSubmit(passcode, next);
          }
        });
      });
  }

  #hydrate(next: NextFn) {
    // hydrating the page
    // Adding event listeners to all buttons without the exclude attribute
    this.rootElement
      .querySelectorAll(
        `descope-button:not([${DESCOPE_ATTRIBUTE_EXCLUDE_NEXT_BUTTON}])`,
      )
      .forEach((button: HTMLButtonElement) => {
        // eslint-disable-next-line no-param-reassign
        button.onclick = () => {
          this.#handleSubmit(button, next);
        };
      });

    this.#addPasscodeAutoSubmitListeners(next);
  }

  #handleAnimation(injectNextPage: () => void, direction: Direction) {
    this.rootElement.addEventListener(
      'transitionend',
      () => {
        this.rootElement.classList.remove('fade-out');
        injectNextPage();
      },
      { once: true },
    );

    const transitionClass =
      direction === Direction.forward ? 'slide-forward' : 'slide-backward';

    Array.from(
      this.rootElement.getElementsByClassName('input-container'),
    ).forEach((ele, i) => {
      // eslint-disable-next-line no-param-reassign
      (ele as HTMLElement).style['transition-delay'] = `${i * 40}ms`;
      ele.classList.add(transitionClass);
    });

    this.rootElement.classList.add('fade-out');
  }

  #dispatch(eventName: string, detail: any) {
    this.dispatchEvent(new CustomEvent(eventName, { detail }));
  }
}

export default DescopeWc;
