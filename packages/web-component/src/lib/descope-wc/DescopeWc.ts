import {
  CUSTOM_INTERACTIONS,
  DESCOPE_ATTRIBUTE_EXCLUDE_FIELD,
  ELEMENT_TYPE_ATTRIBUTE,
  RESPONSE_ACTIONS,
} from '../constants';
import {
  fetchContent,
  generateFnsFromScriptTags,
  getAnimationDirection,
  getContentUrl,
  getElementDescopeAttributes,
  handleAutoFocus,
  isConditionalLoginSupported,
  replaceWithScreenState,
  setTOTPVariable,
  State,
  withMemCache,
} from '../helpers';
import { calculateConditions, calculateCondition } from '../helpers/conditions';
import { getLastAuth, setLastAuth } from '../helpers/lastAuth';
import { IsChanged } from '../helpers/state';
import { disableWebauthnButtons } from '../helpers/templates';
import {
  Direction,
  FlowState,
  NextFn,
  NextFnReturnPromiseValue,
  SdkConfig,
  StepState,
} from '../types';
import BaseDescopeWc from './BaseDescopeWc';

// this class is responsible for WC flow execution
class DescopeWc extends BaseDescopeWc {
  static set sdkConfigOverrides(config: Partial<SdkConfig>) {
    BaseDescopeWc.sdkConfigOverrides = config;
  }

  flowState: State<FlowState>;

  stepState = new State<StepState>({} as StepState, {
    updateOnlyOnChange: false,
  });

  #currentInterval: NodeJS.Timeout;

  #conditionalUiAbortController = null;

  constructor() {
    const flowState = new State<FlowState>();
    super(flowState.update.bind(flowState));

    this.flowState = flowState;
  }

  async connectedCallback() {
    if (this.shadowRoot.isConnected) {
      this.flowState?.subscribe(this.onFlowChange.bind(this));
      this.stepState?.subscribe(this.onStepChange.bind(this));
    }
    await super.connectedCallback();
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    this.flowState.unsubscribeAll();
    this.stepState.unsubscribeAll();
  }

  async onFlowChange(
    currentState: FlowState,
    prevState: FlowState,
    isChanged: IsChanged<FlowState>
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
      redirectUrl,
      token,
      code,
      exchangeError,
      webauthnTransactionId,
      webauthnOptions,
      redirectAuthCodeChallenge,
      redirectAuthCallbackUrl,
      oidcIdpStateId,
    } = currentState;

    if (this.#currentInterval) {
      this.#resetCurrentInterval();
    }

    let startScreenId: string;
    let conditionInteractionId: string;
    const loginId = this.sdk.getLastUserLoginId();
    const flowConfig = await this.getFlowConfig();

    const redirectAuth =
      redirectAuthCallbackUrl && redirectAuthCodeChallenge
        ? {
            callbackUrl: redirectAuthCallbackUrl,
            codeChallenge: redirectAuthCodeChallenge,
          }
        : undefined;

    // if there is no execution id we should start a new flow
    if (!executionId) {
      if (flowConfig.conditions) {
        ({ startScreenId, conditionInteractionId } = calculateConditions(
          { loginId, code },
          flowConfig.conditions
        ));
      } else if (flowConfig.condition) {
        ({ startScreenId, conditionInteractionId } = calculateCondition(
          flowConfig.condition,
          { loginId, code }
        ));
      } else {
        startScreenId = flowConfig.startScreenId;
      }

      if (!startScreenId) {
        const inputs = code
          ? {
            exchangeCode: code,
            idpInitiated: true,
          }
          : undefined;
        const sdkResp = await this.sdk.flow.start(
          flowId,
          {
            tenant,
            redirectAuth,
            oidcIdpStateId,
            ...(redirectUrl && { redirectUrl }),
          },
          conditionInteractionId,
          '',
          inputs,
          flowConfig.version
        );

        this.#handleSdkResponse(sdkResp);
        if (sdkResp?.data?.status !== 'completed') {
          this.flowState.update({ code: undefined });
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
        {
          token,
          exchangeCode: code,
          exchangeError,
        },
        flowConfig.version
      );
      this.#handleSdkResponse(sdkResp);
      this.flowState.update({
        token: undefined,
        code: undefined,
        exchangeError: undefined,
      }); // should happen after handleSdkResponse, otherwise we will not have screen id on the next run
      return;
    }

    if (action === RESPONSE_ACTIONS.redirect) {
      if (!redirectTo) {
        this.logger.error('Did not get redirect url');
      }
      window.location.assign(redirectTo);
      return;
    }

    if (
      action === RESPONSE_ACTIONS.webauthnCreate ||
      action === RESPONSE_ACTIONS.webauthnGet
    ) {
      if (!webauthnTransactionId || !webauthnOptions) {
        this.logger.error('Did not get webauthn transaction id or options');
        return;
      }

      this.#conditionalUiAbortController?.abort();
      this.#conditionalUiAbortController = null;

      let response: string;
      let cancelWebauthn;
      try {
        response =
          action === RESPONSE_ACTIONS.webauthnCreate
            ? await this.sdk.webauthn.helpers.create(webauthnOptions)
            : await this.sdk.webauthn.helpers.get(webauthnOptions);
      } catch (e) {
        if (e.name !== 'NotAllowedError') {
          this.logger.error(e.message);
          return;
        }

        cancelWebauthn = true;
      }
      // Call next with the response and transactionId
      const sdkResp = await this.sdk.flow.next(
        executionId,
        stepId,
        CUSTOM_INTERACTIONS.submit,
        {
          transactionId: webauthnTransactionId,
          response,
          cancelWebauthn,
        },
        flowConfig.version
      );
      this.#handleSdkResponse(sdkResp);
    }

    if (action === RESPONSE_ACTIONS.poll) {
      this.#currentInterval = setInterval(async () => {
        const sdkResp = await this.sdk.flow.next(
          executionId,
          stepId,
          CUSTOM_INTERACTIONS.polling,
          {},
          flowConfig.version
        );
        this.#handleSdkResponse(sdkResp);
      }, 2000);
    }

    // if there is no screen id (probably due to page refresh) we should get it from the server
    if (!screenId && !startScreenId) {
      this.logger.info(
        'Refreshing the page during a flow is not supported yet'
      );
      return;
    }

    // generate step state update data
    const stepStateUpdate: Partial<StepState> = {
      direction: getAnimationDirection(+stepId, +prevState.stepId),
      screenState: {
        ...screenState,
        lastAuth: {
          loginId,
          name: this.sdk.getLastUserDisplayName() || loginId,
        },
      },
      htmlUrl: getContentUrl(projectId, `${startScreenId || screenId}.html`),
    };

    const lastAuth = getLastAuth(loginId);

    if (startScreenId) {
      stepStateUpdate.next = (interactionId, inputs) =>
        this.sdk.flow.start(
          flowId,
          {
            tenant,
            redirectAuth,
            oidcIdpStateId,
            lastAuth,
            ...(redirectUrl && { redirectUrl }),
          },
          conditionInteractionId,
          interactionId,
          {
            ...inputs,
            ...(code && { exchangeCode: code, idpInitiated: true }),
          },
          flowConfig.version
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

  #resetCurrentInterval = () => {
    clearInterval(this.#currentInterval);
    this.#currentInterval = null;
  };

  #handleSdkResponse = (sdkResp: NextFnReturnPromiseValue) => {
    if (!sdkResp?.ok) {
      this.#resetCurrentInterval();
      this.#dispatch('error', sdkResp?.error);
      const defaultMessage = sdkResp?.response?.url;
      const defaultDescription = `${sdkResp?.response?.status} - ${sdkResp?.response?.statusText}`;

      this.logger.error(
        sdkResp?.error?.errorDescription || defaultMessage,
        sdkResp?.error?.errorMessage || defaultDescription
      );
      return;
    }

    const errorText = sdkResp.data?.screen?.state?.errorText;
    if (errorText) {
      this.logger.error(errorText);
    }

    if (sdkResp.data?.error) {
      this.logger.error(
        `[${sdkResp.data.error.code}]: ${sdkResp.data.error.description}`,
        sdkResp.data.error.message
      );
    }

    const { status, authInfo, lastAuth } = sdkResp.data;

    if (status === 'completed') {
      setLastAuth(lastAuth);
      this.#resetCurrentInterval();
      this.#dispatch('success', authInfo);
      return;
    }

    const { executionId, stepId, action, screen, redirect, webauthn } =
      sdkResp.data;

    if (action === RESPONSE_ACTIONS.poll) {
      // We only update action because the polling response action does not return extra information
      this.flowState.update({
        action,
      });
      return;
    }
    this.flowState.update({
      stepId,
      executionId,
      action,
      redirectTo: redirect?.url,
      screenId: screen?.id,
      screenState: screen?.state,
      webauthnTransactionId: webauthn?.transactionId,
      webauthnOptions: webauthn?.options,
    });
  };

  // we want to get the start params only if we don't have it already
  #getWebauthnConditionalUiStartParams = withMemCache(async () => {
    try {
      const startResp = await this.sdk.webauthn.signIn.start(
        '',
        window.location.origin
      ); // when using conditional UI we need to call start without identifier
      if (!startResp.ok) {
        this.logger.error(
          'Webauthn start failed',
          startResp?.error?.errorMessage
        );
      }
      return startResp.data;
    } catch (err) {
      this.logger.error('Webauthn start failed', err.message);
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
    const origName = inputEle.name;

    if (!ignoreList.includes(origName)) {
      const conditionalUiSupportName = `user-${origName}`;

      // eslint-disable-next-line no-param-reassign
      inputEle.name = conditionalUiSupportName;

      inputEle.addEventListener('input', () => {
        // eslint-disable-next-line no-param-reassign
        inputEle.name = inputEle.value ? origName : conditionalUiSupportName;
      });
    }
  }

  async #handleWebauthnConditionalUi(fragment: DocumentFragment, next: NextFn) {
    this.#conditionalUiAbortController?.abort();

    const conditionalUiInput = fragment.querySelector(
      'input[autocomplete="webauthn"]'
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
            const resp = await next(conditionalUiInput.id, {
              transactionId,
              response,
            });
            this.#handleSdkResponse(resp);
          })
          .catch((err) => {
            if (err.name !== 'AbortError') {
              this.logger.error('Conditional login failed', err.message);
            }
          });
      }
    }
  }

  // eslint-disable-next-line class-methods-use-this
  async loadWCUI(clone: any) {
    const descopeEle = Array.from(clone.querySelectorAll('*'))
      .reduce((acc, el) =>
        el.tagName.startsWith('DESCOPE-') ? acc.add(el.tagName.toLocaleLowerCase()) : acc
        , new Set());

    await Promise.all([...descopeEle].map(tag => DescopeUI[tag]()));
  }

  async onStepChange(currentState: StepState, prevState: StepState) {
    const { htmlUrl, direction, next, screenState } = currentState;

    const stepTemplate = document.createElement('template');
    const { body } = await fetchContent(htmlUrl, 'text');
    stepTemplate.innerHTML = body;
    const clone = stepTemplate.content.cloneNode(true) as DocumentFragment;

    const scriptFns = generateFnsFromScriptTags(
      clone,
      await this.getExecutionContext()
    );

    // we want to disable the webauthn buttons if it's not supported on the browser
    if (!this.sdk.webauthn.helpers.isSupported()) {
      disableWebauthnButtons(clone);
    } else {
      await this.#handleWebauthnConditionalUi(clone, next);
    }

    replaceWithScreenState(clone, screenState);

    // put the totp variable on the root element, which is the top level 'div'
    setTOTPVariable(clone.querySelector('div'), screenState?.totp?.image);

    this.loadWCUI(stepTemplate.content);

    const injectNextPage = async () => {
      try {
        scriptFns.forEach((fn) => {
          fn();
        });
      } catch (e) {
        this.logger.error(e.message);
      }

      this.rootElement.replaceChildren(clone);

      // If before html url was empty, we deduce its the first time a screen is shown
      const isFirstScreen = !prevState.htmlUrl;

      handleAutoFocus(this.rootElement, this.autoFocus, isFirstScreen);

      this.#hydrate(next);
      this.#dispatch('page-updated', {});
      const loader = this.rootElement.querySelector(
        `[${ELEMENT_TYPE_ATTRIBUTE}="polling"]`
      );
      if (loader) {
        // Loader component in the screen triggers polling interaction
        const response = await next(CUSTOM_INTERACTIONS.polling, {});
        this.#handleSdkResponse(response);
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
    return Array.from(this.shadowRoot.querySelectorAll('.descope-input')).every(
      (input: HTMLInputElement) => {
        input.reportValidity();
        return input.checkValidity();
      }
    );
  }

  #getFormData() {
    return Array.from(
      this.shadowRoot.querySelectorAll(
        `*[name]:not([${DESCOPE_ATTRIBUTE_EXCLUDE_FIELD}])`
      )
    ).reduce((acc, input: HTMLInputElement) => input.name
        ? Object.assign(acc, {
            [input.name]:
              input[input.type === 'checkbox' ? 'checked' : 'value'],
          })
        : acc, {});
  }

  #handleSubmitButtonLoader(submitter: HTMLButtonElement) {
    const unsubscribeNextRequestStatus = this.nextRequestStatus.subscribe(
      ({ isLoading }) => {
        if (isLoading) {
          submitter?.classList?.add('loading');
        } else {
          this.nextRequestStatus.unsubscribe(unsubscribeNextRequestStatus);
          submitter?.classList?.remove('loading');
        }
      }
    );
  }

  async #handleSubmit(submitter: HTMLButtonElement, next: NextFn) {
    if (submitter.formNoValidate || this.#validateInputs()) {
      const submitterId = submitter?.getAttribute('id');

      this.#handleSubmitButtonLoader(submitter);

      const formData = this.#getFormData();
      const eleDescopeAttrs = getElementDescopeAttributes(submitter);

      const actionArgs = {
        ...eleDescopeAttrs,
        ...formData,
        // 'origin' is required to start webauthn. For now we'll add it to every request
        origin: window.location.origin,
      };

      const sdkResp = await next(submitterId, actionArgs);

      this.#handleSdkResponse(sdkResp);
    }
  }

  #hydrate(next: NextFn) {
    // hydrating the page
    this.rootElement.querySelectorAll('button').forEach((button) => {
      // eslint-disable-next-line no-param-reassign
      button.onclick = () => {
        this.#handleSubmit(button, next);
      };
    });
  }

  #handleAnimation(injectNextPage: () => void, direction: Direction) {
    this.rootElement.addEventListener(
      'transitionend',
      () => {
        this.rootElement.classList.remove('fade-out');
        injectNextPage();
      },
      { once: true }
    );

    const transitionClass =
      direction === Direction.forward ? 'slide-forward' : 'slide-backward';

    Array.from(
      this.rootElement.getElementsByClassName('input-container')
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
