import {
  clearFingerprintData,
  ensureFingerprintIds,
} from '@descope/web-js-sdk';
import {
  CUSTOM_INTERACTIONS,
  DESCOPE_ATTRIBUTE_EXCLUDE_FIELD,
  DESCOPE_ATTRIBUTE_EXCLUDE_NEXT_BUTTON,
  ELEMENT_TYPE_ATTRIBUTE,
  FETCH_ERROR_RESPONSE_ERROR_CODE,
  FETCH_EXCEPTION_ERROR_CODE,
  FLOW_REQUESTED_IS_IN_OLD_VERSION_ERROR_CODE,
  FLOW_TIMED_OUT_ERROR_CODE,
  POLLING_STATUS_NOT_FOUND_ERROR_CODE,
  RESPONSE_ACTIONS,
  SDK_SCRIPTS_LOAD_TIMEOUT,
  URL_CODE_PARAM_NAME,
  URL_RUN_IDS_PARAM_NAME,
  URL_TOKEN_PARAM_NAME,
} from '../constants';
import {
  clearPreviousExternalInputs,
  getAnimationDirection,
  getElementDescopeAttributes,
  getFirstNonEmptyValue,
  getScriptResultPath,
  getUserLocale,
  handleAutoFocus,
  handleReportValidityOnBlur,
  injectSamlIdpForm,
  isConditionalLoginSupported,
  leadingDebounce,
  openCenteredPopup,
  setTOTPVariable,
  showFirstScreenOnExecutionInit,
  State,
  submitForm,
  timeoutPromise,
  transformScreenInputs,
  transformStepStateForCustomScreen,
  updateScreenFromScreenState,
  updateTemplateFromScreenState,
  withMemCache,
} from '../helpers';
import { getABTestingKey } from '../helpers/abTestingKey';
import { calculateCondition, calculateConditions } from '../helpers/conditions';
import { getLastAuth, setLastAuth } from '../helpers/lastAuth';
import { IsChanged } from '../helpers/state';
import {
  disableWebauthnButtons,
  replaceElementMessage,
  setCssVars,
  setNOTPVariable,
  setPhoneAutoDetectDefaultCode,
} from '../helpers/templates';
import {
  ClientScript,
  ComponentsConfig,
  CustomScreenState,
  FlowState,
  NextFn,
  NextFnReturnPromiseValue,
  ScriptElement,
  ScriptModule,
  SdkConfig,
  StepState,
} from '../types';
import BaseDescopeWc from './BaseDescopeWc';

// this class is responsible for WC flow execution
class DescopeWc extends BaseDescopeWc {
  errorTransformer:
    | ((error: { text: string; type: string }) => string)
    | undefined;

  static set sdkConfigOverrides(config: Partial<SdkConfig>) {
    BaseDescopeWc.sdkConfigOverrides = config;
  }

  static get sdkConfigOverrides() {
    return BaseDescopeWc.sdkConfigOverrides;
  }

  flowState: State<FlowState>;

  stepState = new State<StepState>({} as StepState);

  #pollingTimeout: NodeJS.Timeout;

  #conditionalUiAbortController = null;

  onScreenUpdate?: (
    screenName: string,
    context: CustomScreenState,
    next: StepState['next'],
    ref: typeof this,
  ) => boolean | Promise<boolean>;

  #sdkScriptsLoading = null;

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
  bridgeVersion = 2;

  // A collection of callbacks that are maintained as part of the web-component state
  // when it's connected to a native bridge.
  nativeCallbacks: {
    // This callback will be initialized once a 'nativeBridge' action is
    // received from a start or next request. It will then be called by
    // nativeResume if appropriate as part of handling some payload types.
    complete?: (input: Record<string, any>) => Promise<void>;

    // This callback is invoked when 'nativeResume' is called with a 'beforeScreen'
    // type, so the native bridge can resolve the async call to 'nativeBeforeScreen'
    // and tell the web-component whether it wants a custom screen or not.
    screenResolve?: (value: boolean) => void;

    // This callback it kept until 'nativeResume' is called with a 'resumeScreen'
    // type, so the native bridge can submit the result of a custom screen.
    screenNext?: StepState['next'];
  } = {};

  // Notifies the native bridge that we're about to show a new screen and lets it
  // override it by showing a native screen instead.
  async #nativeBeforeScreen(
    screen: string,
    context: CustomScreenState,
    next: StepState['next'],
  ): Promise<boolean> {
    if (this.nativeOptions?.bridgeVersion >= 2) {
      return new Promise<boolean>((resolve) => {
        this.nativeCallbacks.screenNext = next;
        this.nativeCallbacks.screenResolve = resolve;
        this.#nativeNotifyBridge('beforeScreen', { screen, context });
      });
    }
    return false;
  }

  // Notifies the native bridge that a screen has been shown.
  #nativeAfterScreen(screen: string) {
    if (this.nativeOptions?.bridgeVersion >= 2) {
      this.#nativeNotifyBridge('afterScreen', { screen });
    }
  }

  // This callback is called by the native layer to resume a flow
  // that's waiting for some external trigger, such as a magic link
  // redirect or native OAuth authentication.
  nativeResume(type: string, payload: string) {
    const response = JSON.parse(payload);
    if (type === 'oauthWeb' || type === 'sso') {
      let { exchangeCode } = response;
      if (!exchangeCode) {
        const url = new URL(response.url);
        exchangeCode = url.searchParams?.get(URL_CODE_PARAM_NAME);
      }
      this.nativeCallbacks.complete?.({
        exchangeCode,
        idpInitiated: true,
      });
    } else if (type === 'magicLink') {
      const url = new URL(response.url);
      const token = url.searchParams.get(URL_TOKEN_PARAM_NAME);
      const stepId = url.searchParams
        .get(URL_RUN_IDS_PARAM_NAME)
        .split('_')
        .pop();
      this.#resetPollingTimeout();
      // update the state along with cancelling out the action to abort the polling mechanism
      this.flowState.update({ token, stepId, action: undefined });
    } else if (type === 'beforeScreen') {
      const { screenResolve } = this.nativeCallbacks;
      this.nativeCallbacks.screenResolve = null;
      const { override } = response;
      if (!override) {
        this.nativeCallbacks.screenNext = null;
      }
      screenResolve?.(override);
    } else if (type === 'resumeScreen') {
      const { interactionId, form } = response;
      const { screenNext } = this.nativeCallbacks;
      this.nativeCallbacks.screenNext = null;
      screenNext?.(interactionId, form);
    } else {
      // expected: 'oauthNative', 'webauthnCreate', 'webauthnGet', 'failure'
      this.nativeCallbacks.complete?.(response);
    }
  }

  // Utility function for sending a generic message to the native bridge.
  #nativeNotifyBridge(type: string, payload: Record<string, any>) {
    this.#dispatch('bridge', {
      type,
      payload,
    });
  }

  // This object is set by the native layer to
  // inject native specific data into the 'flowState'.
  nativeOptions?: {
    platform: 'ios' | 'android';
    bridgeVersion: number;
    oauthProvider?: string;
    oauthRedirect?: string;
    magicLinkRedirect?: string;
    ssoRedirect?: string;
    origin?: string;
  };

  /**
   * Get all loaded SDK script modules from elements with data-script-id attribute
   * @returns Array of script modules that can be refreshed before form submission
   */
  loadSdkScriptsModules() {
    // Get all modules from the data-script-id elements
    const scriptElements = this.shadowRoot.querySelectorAll(
      'div[data-script-id]',
    );

    // Filter out elements without moduleRes property
    return Array.from(scriptElements)
      .map((el) => (el as ScriptElement).moduleRes)
      .filter((module): module is ScriptModule => !!module);
  }

  loadSdkScripts(scripts: ClientScript[]) {
    if (!scripts?.length) {
      return null;
    }

    const createScriptCallback =
      (
        script: {
          id: string;
          resultKey?: string;
        },
        resolve: (value: any) => void,
      ) =>
      (result: string) => {
        this.dispatchEvent(
          // update the context with the result, under the `resultKey` key
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
        resolve(script.id);
      };

    this.loggerWrapper.debug(
      `Preparing to load scripts: ${scripts.map((s) => s.id).join(', ')}`,
    );
    const promises = Promise.all(
      scripts?.map(async (script) => {
        const scriptElement = this.shadowRoot.querySelector(
          `[data-script-id="${script.id}"]`,
        ) as ScriptElement;
        if (scriptElement) {
          this.loggerWrapper.debug('Script already loaded', script.id);
          const { moduleRes } = scriptElement;
          moduleRes?.start?.();
          return moduleRes;
        }
        await this.injectNpmLib(
          '@descope/flow-scripts',
          '1.0.11', // currently using a fixed version when loading scripts
          `dist/${script.id}.js`,
        );
        const module = globalThis.descope?.[script.id];
        return new Promise((resolve, reject) => {
          try {
            const moduleRes = module(
              script.initArgs as any,
              { baseUrl: this.baseUrl, ref: this },
              createScriptCallback(script, resolve),
            );
            if (moduleRes) {
              const newScriptElement = document.createElement(
                'div',
              ) as ScriptElement;
              newScriptElement.setAttribute('data-script-id', script.id);
              newScriptElement.moduleRes = moduleRes;
              this.shadowRoot.appendChild(newScriptElement);
              this.nextRequestStatus.subscribe(() => {
                this.loggerWrapper.debug('Unloading script', script.id);
                moduleRes.stop?.();
              });
            }
          } catch (e) {
            reject(e);
          }
        });
      }),
    );

    const toPromise = new Promise((resolve) => {
      setTimeout(() => {
        this.loggerWrapper.warn('SDK scripts loading timeout');
        resolve(true);
      }, SDK_SCRIPTS_LOAD_TIMEOUT);
    });

    return Promise.race([promises, toPromise]);
  }

  get isDismissScreenErrorOnInput() {
    return this.getAttribute('dismiss-screen-error-on-input') === 'true';
  }

  #handleGlobalErrors({
    errorText,
    errorType,
  }: {
    errorText: string;
    errorType: string;
  }) {
    const updateGlobalError = () => {
      let transformedErrorText = errorText;
      try {
        transformedErrorText =
          this.errorTransformer?.({
            text: errorText,
            type: errorType,
          }) || errorText;
      } catch (e) {
        this.loggerWrapper.error('Error transforming error message', e.message);
      }
      replaceElementMessage(
        this.contentRootElement,
        'error-message',
        transformedErrorText,
      );
    };

    // we do not know if the page is going to be updated or not,
    // so we are updating the error message component before and after the screen update
    this.addEventListener('screen-updated', updateGlobalError, { once: true });
    updateGlobalError();
  }

  init() {
    // when running in a webview (mobile SDK) we want to lazy init the component
    // so the mobile SDK will be able to register all the necessary callbacks
    // before the component will start loading the flow
    if (!(window as any).descopeBridge) {
      // eslint-disable-next-line no-underscore-dangle
      return this._init();
    }
    // eslint-disable-next-line no-underscore-dangle
    (this as any).lazyInit = this._init;
    return undefined;
  }

  #subscribeStepState() {
    this.stepState?.subscribe(
      this.onStepChange.bind(this),
      ({
        screenState: { errorText, errorType, ...screenState } = {},
        ...state
      }) => ({ ...state, screenState }),
    );

    this.stepState?.subscribe(
      this.#handleGlobalErrors.bind(this),
      (state) => ({
        errorText: state?.screenState?.errorText,
        errorType: state?.screenState?.errorType,
      }),
      { forceUpdate: true },
    );

    this.stepState?.subscribe(
      this.#handlePasscodeCleanup.bind(this),
      (state) => ({
        errorText: state?.screenState?.errorText,
        errorType: state?.screenState?.errorType,
      }),
      { forceUpdate: true },
    );
  }

  // because the screen does not re-render,
  // in case of an OTP code error, we want to clean the invalid code
  #handlePasscodeCleanup({ errorText, errorType }) {
    if (errorType || errorText) {
      this.contentRootElement
        .querySelectorAll('descope-passcode[data-auto-submit="true"]')
        .forEach((passcodeEle: HTMLInputElement) => {
          // currently we do not have a way to reset the code value
          // so we are clearing the inputs
          passcodeEle.shadowRoot
            .querySelectorAll('descope-text-field[data-id]')
            .forEach((input: HTMLInputElement) => {
              // eslint-disable-next-line no-param-reassign
              input.value = '';
            });
        });

      // this should not be handled here, it's a workaround for focusing the code component on error
      // maybe it's about time to refactor this sdk
      handleAutoFocus(this.contentRootElement, this.autoFocus, false);
    }
  }

  // eslint-disable-next-line no-underscore-dangle
  async _init() {
    if (this.shadowRoot.isConnected) {
      this.flowState?.subscribe(this.onFlowChange.bind(this));
      this.#subscribeStepState();

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

  async getPageContent(htmlFilename: string, htmlLocaleFilename: string) {
    if (htmlLocaleFilename) {
      // try first locale url, if can't get for some reason, fallback to the original html url (the one without locale)
      try {
        const { body } = await this.fetchStaticResource(
          htmlLocaleFilename,
          'text',
        );
        return body;
      } catch (ex) {
        this.loggerWrapper.error(
          `Failed to fetch flow page from ${htmlLocaleFilename}. Fallback to url ${htmlFilename}`,
          ex,
        );
      }
    }

    try {
      const { body } = await this.fetchStaticResource(htmlFilename, 'text');
      return body;
    } catch (ex) {
      this.loggerWrapper.error(`Failed to fetch flow page`, ex.message);
    }
    return null;
  }

  async #handleFlowRestart() {
    this.loggerWrapper.debug('Trying to restart the flow');
    const prevCompVersion = await this.getComponentsVersion();
    this.reset();
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

  #isPrevCustomScreen = false;

  async #handleCustomScreen(stepStateUpdate: Partial<StepState>) {
    const { next, stepName, ...state } = {
      ...this.stepState.current,
      ...stepStateUpdate,
    };

    const context = transformStepStateForCustomScreen(state);

    // first check if we're running in a native bridge and the app wants a custom screen
    let isCustomScreen = await this.#nativeBeforeScreen(
      stepName,
      context,
      next,
    );
    if (!isCustomScreen) {
      // now check any custom callbacks that have been set on the component itself
      isCustomScreen = Boolean(
        await this.onScreenUpdate?.(stepName, context, next, this),
      );
    }

    const isFirstScreen = !this.stepState.current.htmlFilename;
    this.#toggleScreenVisibility(isCustomScreen);

    // if we switched from a custom screen to a regular screen or the other way around
    if (this.#isPrevCustomScreen !== isCustomScreen) {
      const [currentMode, prevMode] = ['flow', 'custom'].sort(() =>
        isCustomScreen ? -1 : 1,
      );
      this.loggerWrapper.debug(
        `Switching from ${prevMode} screen to ${currentMode} screen`,
      );

      this.#isPrevCustomScreen = isCustomScreen;

      if (isCustomScreen) {
        // we are unsubscribing all the listeners because we are going to render a custom screen
        // and we do not want that onStepChange will be called
        this.stepState.unsubscribeAll();
      } else {
        // we are subscribing to the step state again because we are going to render a regular screen
        this.#subscribeStepState();
      }
    }

    if (isCustomScreen) {
      this.loggerWrapper.debug('Showing a custom screen');
      this.#dispatchPageEvents({
        isFirstScreen,
        isCustomScreen,
        stepName: stepStateUpdate.stepName,
      });
    }

    this.stepState.forceUpdate = isCustomScreen;
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
      redirectIsPopup,
      redirectUrl,
      token,
      code,
      isPopup,
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
      reqTimestamp,
      ...ssoQueryParams
    } = currentState;

    let startScreenId: string;
    let startScreenName: string;
    let conditionInteractionId: string;
    const abTestingKey = getABTestingKey();
    const { outboundAppId } = this;
    const { outboundAppScopes } = this;
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
          bridgeVersion: this.nativeOptions.bridgeVersion,
          oauthProvider: this.nativeOptions.oauthProvider,
          oauthRedirect: this.nativeOptions.oauthRedirect,
          magicLinkRedirect: this.nativeOptions.magicLinkRedirect,
          ssoRedirect: this.nativeOptions.ssoRedirect,
        }
      : undefined;
    let conditionComponentsConfig: ComponentsConfig = {};

    // if there is no execution id we should start a new flow
    if (!executionId) {
      const clientScripts = [
        ...(flowConfig.clientScripts || []),
        ...(flowConfig.sdkScripts || []),
      ];

      if (flowConfig.conditions) {
        let conditionScripts = [];
        ({
          startScreenId,
          conditionInteractionId,
          startScreenName,
          clientScripts: conditionScripts,
          componentsConfig: conditionComponentsConfig,
        } = calculateConditions(
          {
            loginId,
            code,
            token,
            abTestingKey,
            lastAuth: getLastAuth(loginId),
          },
          flowConfig.conditions,
        ));
        clientScripts.push(...(conditionScripts || []));
      } else if (flowConfig.condition) {
        ({ startScreenId, conditionInteractionId } = calculateCondition(
          flowConfig.condition,
          {
            loginId,
            code,
            token,
            abTestingKey,
            lastAuth: getLastAuth(loginId),
          },
        ));
      } else {
        startScreenName = flowConfig.startScreenName;
        startScreenId = flowConfig.startScreenId;
      }

      this.#sdkScriptsLoading = this.loadSdkScripts(clientScripts);
      if (flowConfig.fingerprintEnabled && flowConfig.fingerprintKey) {
        await ensureFingerprintIds(flowConfig.fingerprintKey, this.baseUrl);
      } else {
        clearFingerprintData();
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
            outboundAppId,
            outboundAppScopes,
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

    this.loggerWrapper.debug(
      'Before popup postmessage send',
      JSON.stringify({
        isPopup,
        code,
        exchangeError,
        isCodeChanged: isChanged('code'),
        isExchangeErrorChanged: isChanged('exchangeError'),
      }),
    );
    if (
      isPopup &&
      ((isChanged('code') && code) ||
        (isChanged('exchangeError') && exchangeError))
    ) {
      this.loggerWrapper.debug('Creating popup channel', executionId);
      const channel = new BroadcastChannel(executionId);
      this.loggerWrapper.debug(
        'Posting message to popup channel',
        JSON.stringify({ code, exchangeError }),
      );
      channel.postMessage({
        data: { code, exchangeError },
        action: 'code',
      });
      this.loggerWrapper.debug('Popup channel message posted, closing channel');
      channel.close();
      this.loggerWrapper.debug('Popup channel closed, closing window');
      window.close();
      return;
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

      this.loggerWrapper.debug(`Redirect is popup ${redirectIsPopup}`);
      if (redirectIsPopup) {
        // this width is below the breakpoint of most providers
        this.loggerWrapper.debug('Opening redirect in popup');
        const popup = openCenteredPopup(redirectTo, '?', 598, 700);

        this.loggerWrapper.debug('Creating broadcast channel');
        const channel = new BroadcastChannel(executionId);

        this.loggerWrapper.debug('Starting popup closed detection');
        // detect when the popup is closed
        const intervalId = setInterval(() => {
          if (popup.closed) {
            this.loggerWrapper.debug(
              'Popup closed, dispatching popupclosed event and clearing interval',
            );
            clearInterval(intervalId);

            // we are dispatching a popupclosed event so we can handle it on other parts of the code (loading state management)
            this.#dispatch('popupclosed', {});

            this.loggerWrapper.debug('Closing channel');
            channel.close();
          }
        }, 1000);

        this.loggerWrapper.debug('Listening for postMessage on channel');
        const onPostMessage = (event: MessageEvent) => {
          this.loggerWrapper.debug(
            'Received postMessage on channel',
            JSON.stringify(event),
          );
          this.loggerWrapper.debug(
            'Comparing origins',
            JSON.stringify({
              eventOrigin: event.origin,
              windowLocationOrigin: window.location.origin,
            }),
          );
          if (event.origin !== window.location.origin) return;

          this.loggerWrapper.debug(
            'PostMessage origin matches, processing message',
          );
          // eslint-disable-next-line @typescript-eslint/no-shadow
          const { action, data } = event.data;
          this.loggerWrapper.debug(
            `PostMessage action: ${action}, data: ${JSON.stringify(data)}`,
          );
          if (action === 'code') {
            this.loggerWrapper.debug(
              'Updating flow state with code and exchangeError',
            );
            this.flowState.update({
              code: data.code,
              exchangeError: data.exchangeError,
            });
          }
        };

        channel.onmessage = onPostMessage;
      } else {
        this.handleRedirect(redirectTo);
        // on web we should not get here
        // but on mobile, there is no actual redirect, instead we are opening the url in a new browser tab
        // so we need to reset the loading state of the components, otherwise, they are staying in loading state
        this.#dispatch('popupclosed', {});
      }
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
      this.nativeCallbacks.complete = async (input: Record<string, any>) => {
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
      // the response will be in the form of calling the 'nativeCallbacks.complete' callback via
      // the 'nativeResume' function.
      this.#nativeNotifyBridge(nativeResponseType, nativePayload);
      return;
    }

    if (isChanged('action')) {
      this.#handlePollingResponse(
        executionId,
        stepId,
        flowConfig.version,
        projectConfig.componentsVersion,
      );
    }

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

    const {
      oidcLoginHint,
      oidcPrompt,
      oidcErrorRedirectUri,
      oidcResource,
      samlIdpUsername,
    } = ssoQueryParams;

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
        componentsConfig: {
          ...flowConfig.componentsConfig,
          ...conditionComponentsConfig,
          ...screenState?.componentsConfig,
        },
      },
      htmlFilename: `${readyScreenId}.html`,
      htmlLocaleFilename: filenameWithLocale,
      screenId: readyScreenId,
      stepName: currentState.stepName || startScreenName,
      samlIdpUsername,
      oidcLoginHint,
      oidcPrompt,
      oidcErrorRedirectUri,
      oidcResource,
      action,
    };

    const lastAuth = getLastAuth(loginId);

    // If there is a start screen id, next action should start the flow
    // But if any of the sso params are not empty, this optimization doesn't happen
    // because Descope may decide not to show the first screen (in cases like a user is already logged in) - this is more relevant for SSO scenarios
    if (showFirstScreenOnExecutionInit(startScreenId, ssoQueryParams)) {
      stepStateUpdate.next = async (interactionId, inputs) => {
        const res = await this.sdk.flow.start(
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
            outboundAppId,
            outboundAppScopes,
          },
          conditionInteractionId,
          interactionId,
          projectConfig.componentsVersion,
          flowVersions,
          {
            ...this.formConfigValues,
            ...transformScreenInputs(inputs),
            ...(code && { exchangeCode: code, idpInitiated: true }),
            ...(ssoQueryParams.descopeIdpInitiated && { idpInitiated: true }),
            ...(token && { token }),
          },
        );

        this.#handleSdkResponse(res);

        return res;
      };
    } else if (
      isChanged('projectId') ||
      isChanged('baseUrl') ||
      isChanged('executionId') ||
      isChanged('stepId')
    ) {
      stepStateUpdate.next = async (interactionId, input) => {
        const res = await this.sdk.flow.next(
          executionId,
          stepId,
          interactionId,
          flowConfig.version,
          projectConfig.componentsVersion,
          transformScreenInputs(input),
        );

        this.#handleSdkResponse(res);

        return res;
      };
    }

    this.loggerWrapper.debug('Got a screen with id', stepStateUpdate.screenId);

    await this.#handleCustomScreen(stepStateUpdate);

    // update step state
    this.stepState.update(stepStateUpdate);
  }

  // this function is used to handle redirects in the web component
  // it can be overridden by the user to handle redirects in a custom way
  // eslint-disable-next-line class-methods-use-this
  handleRedirect = (redirectTo: string) => {
    window.location.assign(redirectTo);
  };

  #toggleScreenVisibility = (isCustomScreen: boolean) => {
    const toggleVisibility = () => {
      this.contentRootElement.classList.toggle('hidden', isCustomScreen);
      this.slotElement.classList.toggle('hidden', !isCustomScreen);
      if (isCustomScreen) {
        this.contentRootElement.innerHTML = '';
      }
    };

    if (isCustomScreen && this.contentRootElement.hasChildNodes()) {
      this.#handlePageSwitchTransition(toggleVisibility);
    } else {
      toggleVisibility();
    }
  };

  #handlePageSwitchTransition(onTransitionEnd: () => void) {
    const transitionEndHandler = () => {
      this.loggerWrapper.debug('page switch transition end');
      this.contentRootElement.classList.remove('fade-out');
      onTransitionEnd();
    };
    this.contentRootElement.addEventListener(
      'transitionend',
      transitionEndHandler,
      { once: true },
    );
    this.loggerWrapper.debug('page switch transition start');
    this.contentRootElement.classList.add('fade-out');
  }

  #handlePollingResponse = (
    executionId: string,
    stepId: string,
    flowVersion: number,
    componentsVersion: string,
    rescheduled: boolean = false,
  ) => {
    const pollingDefaultDelay = 2000;
    const pollingDefaultTimeout = 6000;
    const pollingThrottleDelay = 500;
    const pollingThrottleThreshold = 500;
    const pollingThrottleTimeout = 1000;
    const stopOnErrors = [
      FLOW_TIMED_OUT_ERROR_CODE,
      POLLING_STATUS_NOT_FOUND_ERROR_CODE,
    ];

    if (this.flowState.current.action === RESPONSE_ACTIONS.poll) {
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

        // we want to stop polling for some errors
        if (
          !sdkResp?.error?.errorCode ||
          !stopOnErrors.includes(sdkResp.error.errorCode)
        ) {
          // will poll again if needed
          // handleSdkResponse will clear the timeout if the response action is not polling response
          this.#handlePollingResponse(
            executionId,
            stepId,
            flowVersion,
            componentsVersion,
          );
        } else {
          this.logger.debug('polling - Stopping polling due to error');
        }

        this.#handleSdkResponse(sdkResp);
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

      const errorCode = sdkResp?.error?.errorCode;
      if (
        (errorCode === FLOW_REQUESTED_IS_IN_OLD_VERSION_ERROR_CODE ||
          errorCode === FLOW_TIMED_OUT_ERROR_CODE) &&
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

    const { status, authInfo, lastAuth, action, openInNewTabUrl } =
      sdkResp.data;

    if (action !== RESPONSE_ACTIONS.poll) {
      this.#resetPollingTimeout();
    }

    if (status === 'completed') {
      if (this.storeLastAuthenticatedUser) {
        setLastAuth(lastAuth);
      }
      this.#dispatch('success', authInfo);
      return;
    } else {
      if (this.storeLastAuthenticatedUser) {
        setLastAuth(lastAuth, true);
      }
    }

    if (openInNewTabUrl) {
      window.open(openInNewTabUrl, '_blank');
      // we should not return here so the screen will be rendered
    }

    const {
      executionId,
      stepId,
      stepName,
      screen,
      redirect,
      webauthn,
      error,
      samlIdpResponse,
      nativeResponse,
    } = sdkResp.data;

    // this is used as a cache buster
    // we want to make sure the onScreenUpdate will be called after every next call even if the state was not changed
    const reqTimestamp = Date.now();

    if (action === RESPONSE_ACTIONS.poll) {
      // We only update action because the polling response action does not return extra information
      this.flowState.update({
        action,
        reqTimestamp,
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

    if (screen.state?.clientScripts) {
      this.#sdkScriptsLoading = this.loadSdkScripts(screen.state.clientScripts);
    }

    this.flowState.update({
      stepId,
      stepName,
      executionId,
      action,
      redirectTo: redirect?.url,
      redirectIsPopup: redirect?.isPopup,
      screenId: screen?.id,
      screenState: screen?.state,
      webauthnTransactionId: webauthn?.transactionId,
      webauthnOptions: webauthn?.options,
      samlIdpResponseUrl: samlIdpResponse?.url,
      samlIdpResponseSamlResponse: samlIdpResponse?.samlResponse,
      samlIdpResponseRelayState: samlIdpResponse?.relayState,
      nativeResponseType: nativeResponse?.type,
      nativePayload: nativeResponse?.payload,
      reqTimestamp,
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

        // we should not wait for this fn, it will call next when the user uses his passkey on the input
        this.sdk.webauthn.helpers
          .conditional(options, this.#conditionalUiAbortController)
          .then(async (response) => {
            next(conditionalUiInput.id, {
              transactionId,
              response,
            });
          })
          .catch((err) => {
            if (err.name !== 'AbortError') {
              this.loggerWrapper.error('Conditional login failed', err.message);
            }
          });
      }
    }
  }

  #dispatchPageEvents({
    isFirstScreen,
    isCustomScreen,
    stepName,
  }: {
    isFirstScreen: boolean;
    isCustomScreen: boolean;
    stepName: string;
  }) {
    if (isFirstScreen) {
      // Dispatch when the first page is ready
      // So user can show a loader until his event is triggered
      this.#dispatch('ready', {});
    }

    if (!isCustomScreen) {
      this.#nativeAfterScreen(stepName);
    }

    this.#dispatch('page-updated', { screenName: stepName });
    this.#dispatch('screen-updated', { screenName: stepName });
  }

  async onStepChange(currentState: StepState, prevState: StepState) {
    const { htmlFilename, htmlLocaleFilename, direction, next, screenState } =
      currentState;

    this.loggerWrapper.debug('Rendering a flow screen');

    const stepTemplate = document.createElement('template');
    stepTemplate.innerHTML = await this.getPageContent(
      htmlFilename,
      htmlLocaleFilename,
    );

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
      this.loggerWrapper,
    );

    // set the default country code based on the locale value we got
    const { geo } = await this.getExecutionContext();
    setPhoneAutoDetectDefaultCode(clone, geo);

    const injectNextPage = async () => {
      await loadDescopeUiComponents;

      // put the totp and notp variable on the root element, which is the top level 'div' inside the shadowRoot
      const rootElement = this.contentRootElement;
      setTOTPVariable(rootElement, screenState?.totp?.image);

      setNOTPVariable(rootElement, screenState?.notp?.image);

      // set dynamic css variables that should be set at runtime
      setCssVars(rootElement, clone, screenState.cssVars, this.loggerWrapper);

      rootElement.replaceChildren(clone);

      // If before html url was empty, we deduce its the first time a screen is shown
      const isFirstScreen = !prevState.htmlFilename;

      // we need to wait for all components to render before we can set its value
      setTimeout(() => {
        this.#updateExternalInputs();

        if (this.validateOnBlur) {
          handleReportValidityOnBlur(rootElement);
        }

        // we need to wait for all components to render before we can set its value
        updateScreenFromScreenState(rootElement, screenState);

        this.#dispatchPageEvents({
          isFirstScreen,
          isCustomScreen: false,
          stepName: currentState.stepName,
        });

        handleAutoFocus(rootElement, this.autoFocus, isFirstScreen);
      });

      this.#hydrate(next);

      const loader = rootElement.querySelector(
        `[${ELEMENT_TYPE_ATTRIBUTE}="polling"]`,
      );
      if (loader) {
        // Loader component in the screen triggers polling interaction
        next(CUSTOM_INTERACTIONS.polling, {});
      }
    };

    // no animation
    if (!direction) {
      injectNextPage();
      return;
    }

    this.#handlePageSwitchTransition(injectNextPage);
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

  getInputs() {
    return Array.from(
      this.shadowRoot.querySelectorAll(
        `*:not(slot)[name]:not([${DESCOPE_ATTRIBUTE_EXCLUDE_FIELD}])`,
      ),
    ) as HTMLInputElement[];
  }

  async #getFormData() {
    const inputs = this.getInputs();

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

  #prevPageShowListener: ((e: PageTransitionEvent) => void) | null = null;

  #handleComponentsLoadingState(submitter: HTMLElement) {
    const enabledElements = Array.from(
      this.contentRootElement.querySelectorAll(
        ':not([disabled]), [disabled="false"]',
      ),
    ).filter((ele) => ele !== submitter);

    const restoreComponentsState = async () => {
      this.loggerWrapper.debug('Restoring components state');
      this.removeEventListener('popupclosed', restoreComponentsState);
      submitter.removeAttribute('loading');
      enabledElements.forEach((ele) => {
        ele.removeAttribute('disabled');
      });
      // if there are client scripts, we want to reload them
      const flowConfig = await this.getFlowConfig();
      const clientScripts = [
        ...(flowConfig.clientScripts || []),
        ...(flowConfig.sdkScripts || []),
      ];
      this.loadSdkScripts(clientScripts);
    };

    const handleScreenIdUpdates = () => {
      // we want to remove the previous pageshow listener to avoid multiple listeners
      window.removeEventListener('pageshow', this.#prevPageShowListener);

      this.#prevPageShowListener = (e) => {
        if (e.persisted) {
          this.logger.debug(
            'Page was loaded from cache, restoring components state',
          );
          restoreComponentsState();
        }
      };
      // we want to restore the components state when the page is shown from cache
      window.addEventListener('pageshow', this.#prevPageShowListener, {
        once: true,
      });

      // we want to restore the components state when the screenId is updated
      const unsubscribeScreenIdUpdates = this.stepState?.subscribe(
        (screenId, prevScreenId) => {
          // we want to restore components state only if we stay on the same screen
          // if we are rendering a new screen, the components state (disabled/loading) will remain until the new screen is rendered
          if (screenId === prevScreenId) {
            restoreComponentsState();
          }
          this.removeEventListener('popupclosed', restoreComponentsState);
          this.stepState.unsubscribe(unsubscribeScreenIdUpdates);
        },
        (state) => state.screenId,
        { forceUpdate: true },
      );
    };

    // we are listening to the next request status
    const unsubscribeNextRequestStatus = this.nextRequestStatus.subscribe(
      ({ isLoading }) => {
        if (isLoading) {
          this.addEventListener('popupclosed', restoreComponentsState, {
            once: true,
          });
          // if the next request is loading, we want to set loading state on the submitter, and disable all other enabled elements
          submitter.setAttribute('loading', 'true');
          enabledElements.forEach((ele) =>
            ele.setAttribute('disabled', 'true'),
          );
        } else {
          this.nextRequestStatus.unsubscribe(unsubscribeNextRequestStatus);
          // when next request is done, we want to listen to screenId updates
          handleScreenIdUpdates();
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

    const eles = this.contentRootElement.querySelectorAll(
      '[external-input="true"]',
    );
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
        this.#handleComponentsLoadingState(submitter);

        const formData = await this.#getFormData();
        const eleDescopeAttrs = getElementDescopeAttributes(submitter);

        this.nextRequestStatus.update({ isLoading: true });

        if (this.#sdkScriptsLoading) {
          this.loggerWrapper.debug('Waiting for sdk scripts to load');
          const now = Date.now();
          await this.#sdkScriptsLoading;
          this.loggerWrapper.debug(
            'Sdk scripts loaded for',
            (Date.now() - now).toString(),
          );
        }

        // Get all script modules and refresh them before form submission
        const sdkScriptsModules = this.loadSdkScriptsModules();

        if (sdkScriptsModules.length > 0) {
          // Only attempt to refresh modules that actually have a refresh function
          const refreshPromises = sdkScriptsModules
            .filter((module) => typeof module.refresh === 'function')
            .map((module) => module.refresh!());

          if (refreshPromises.length > 0) {
            // Use timeout to prevent hanging if refresh takes too long
            await timeoutPromise(
              SDK_SCRIPTS_LOAD_TIMEOUT,
              Promise.all(refreshPromises),
              null,
            );
          }
        }

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

        await next(submitterId, actionArgs);

        this.nextRequestStatus.update({ isLoading: false });

        this.#handleStoreCredentials(formData);
      }
    },
  );

  #addPasscodeAutoSubmitListeners(next: NextFn) {
    this.contentRootElement
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
    this.contentRootElement
      .querySelectorAll(
        `descope-button:not([${DESCOPE_ATTRIBUTE_EXCLUDE_NEXT_BUTTON}]), [data-type="button"]:not([${DESCOPE_ATTRIBUTE_EXCLUDE_NEXT_BUTTON}]`,
      )
      .forEach((button: HTMLButtonElement) => {
        // eslint-disable-next-line no-param-reassign
        button.onclick = () => {
          this.#handleSubmit(button, next);
        };
      });

    this.#addPasscodeAutoSubmitListeners(next);

    if (this.isDismissScreenErrorOnInput) {
      // listen to all input events in order to clear the global error state
      this.contentRootElement
        .querySelectorAll(`*[name]:not([${DESCOPE_ATTRIBUTE_EXCLUDE_FIELD}])`)
        .forEach((ele) => {
          ele.addEventListener('input', () => {
            this.stepState.update((state) => ({
              ...state,
              screenState: {
                ...state.screenState,
                errorText: '',
                errorType: '',
              },
            }));
          });
        });
    }
  }

  #dispatch(eventName: string, detail: any) {
    this.dispatchEvent(new CustomEvent(eventName, { detail }));
  }
}

export default DescopeWc;
