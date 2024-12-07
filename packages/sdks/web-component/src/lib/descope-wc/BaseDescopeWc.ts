import createSdk from '@descope/web-js-sdk';
import { themeMixin } from '@descope/sdk-mixins';
import { compose } from '@descope/sdk-helpers';
import {
  CONFIG_FILENAME,
  ELEMENTS_TO_IGNORE_ENTER_KEY_ON,
  FETCH_EXCEPTION_ERROR_CODE,
  PREV_VER_ASSETS_FOLDER,
} from '../constants';
import {
  camelCase,
  clearRunIdsFromUrl,
  fetchContent,
  getContentUrl,
  getRunIdsFromUrl,
  handleUrlParams,
  State,
  withMemCache,
} from '../helpers';
import { IsChanged } from '../helpers/state';
import { formMountMixin } from '../mixins';
import {
  AutoFocusOptions,
  DebuggerMessage,
  DebugState,
  FlowState,
  FlowStateUpdateFn,
  SdkConfig,
  DescopeUI,
  ProjectConfiguration,
  FlowConfig,
  FlowStatus,
} from '../types';
import initTemplate from './initTemplate';
import {
  extractNestedAttribute,
  transformFlowInputFormData,
} from '../helpers/flowInputs';

// this is replaced in build time
declare const BUILD_VERSION: string;

const BaseClass = compose(themeMixin, formMountMixin)(HTMLElement);

// this base class is responsible for WC initialization
class BaseDescopeWc extends BaseClass {
  static get observedAttributes() {
    return [
      'project-id',
      'flow-id',
      'base-url',
      'tenant',
      'locale',
      'debug',
      'storage-prefix',
      'preview',
      'redirect-url',
      'auto-focus',
      'store-last-authenticated-user',
      'keep-last-authenticated-user-after-logout',
      'validate-on-blur',
      'style-id',
    ];
  }

  // this is a way for extending the sdk config from outside
  static sdkConfigOverrides: Partial<SdkConfig> = {
    baseHeaders: {
      'x-descope-sdk-name': 'web-component',
      'x-descope-sdk-version': BUILD_VERSION,
    },
  };

  #init = false;

  flowStatus: FlowStatus = 'initial';

  loggerWrapper = {
    error: (message: string, description = '') => {
      this.logger.error(message, description, new Error());
      this.#updateDebuggerMessages(message, description);
    },
    warn: (message: string, description = '') => {
      this.logger.warn(message, description);
    },
    info: (message: string, description = '', state: any = {}) => {
      this.logger.info(message, description, state);
    },
    debug: (message: string, description = '') => {
      this.logger.debug(message, description);
    },
  };

  #flowState = new State<FlowState>();

  #debugState = new State<DebugState>();

  #componentsContext = {};

  getComponentsContext = () => this.#componentsContext;

  nextRequestStatus = new State<{ isLoading: boolean }>({ isLoading: false });

  rootElement: HTMLDivElement;

  #debuggerEle: HTMLElement & {
    updateData: (data: DebuggerMessage | DebuggerMessage[]) => void;
  };

  #eventsCbRefs = {
    popstate: this.#syncStateIdFromUrl.bind(this),
    componentsContext: this.#handleComponentsContext.bind(this),
  };

  sdk: ReturnType<typeof createSdk>;

  #updateExecState: FlowStateUpdateFn;

  descopeUI: Promise<DescopeUI>;

  constructor(updateExecState: FlowStateUpdateFn) {
    super();
    this.#updateExecState = updateExecState;

    this.#initShadowDom();
  }

  #initShadowDom() {
    this.shadowRoot.appendChild(initTemplate.content.cloneNode(true));

    this.rootElement = this.shadowRoot.querySelector<HTMLDivElement>('#root');
  }

  get flowId() {
    return this.getAttribute('flow-id');
  }

  set flowId(value: string) {
    this.setAttribute('flow-id', value);
  }

  get client() {
    try {
      return (JSON.parse(this.getAttribute('client')) || {}) as Record<
        string,
        any
      >;
    } catch (e) {
      return {};
    }
  }

  set client(value: any) {
    this.setAttribute('client', value);
  }

  get tenant() {
    return this.getAttribute('tenant') || undefined;
  }

  set tenant(value: string) {
    this.setAttribute('tenant', value);
  }

  get redirectUrl() {
    return this.getAttribute('redirect-url') || undefined;
  }

  set redirectUrl(value: string) {
    this.setAttribute('redirect-url', value);
  }

  get debug() {
    return this.getAttribute('debug') === 'true';
  }

  set debug(value: any) {
    this.setAttribute('debug', value);
  }

  get locale() {
    return this.getAttribute('locale') || undefined;
  }

  set locale(value: string) {
    this.setAttribute('locale', value);
  }

  get autoFocus(): AutoFocusOptions {
    const res = this.getAttribute('auto-focus') ?? 'true';
    if (res === 'skipFirstScreen') {
      return res;
    }
    return res === 'true';
  }

  set autoFocus(value: any) {
    this.setAttribute('auto-focus', value);
  }

  get validateOnBlur() {
    return this.getAttribute('validate-on-blur') === 'true';
  }

  set validateOnBlur(value: any) {
    this.setAttribute('validate-on-blur', value);
  }

  get storeLastAuthenticatedUser() {
    const res = this.getAttribute('store-last-authenticated-user') ?? 'true';
    return res === 'true';
  }

  set storeLastAuthenticatedUser(value: any) {
    this.setAttribute('store-last-authenticated-user', value);
  }

  get keepLastAuthenticatedUserAfterLogout() {
    const res = this.getAttribute('keep-last-authenticated-user-after-logout');
    return res === 'true';
  }

  set keepLastAuthenticatedUserAfterLogout(value: any) {
    this.setAttribute('keep-last-authenticated-user-after-logout', value);
  }

  get storagePrefix() {
    return this.getAttribute('storage-prefix') || '';
  }

  set storagePrefix(value: string) {
    this.setAttribute('storage-prefix', value);
  }

  get preview() {
    return !!this.getAttribute('preview');
  }

  set preview(value: any) {
    this.setAttribute('preview', value);
  }

  get formConfig() {
    return transformFlowInputFormData(this.form);
  }

  get form() {
    return this.getAttribute('form');
  }

  set form(value: string) {
    this.setAttribute('form', value);
  }

  get formConfigValues() {
    return extractNestedAttribute(this.formConfig, 'value');
  }

  #validateAttrs() {
    const optionalAttributes = [
      'base-url',
      'tenant',
      'locale',
      'debug',
      'redirect-url',
      'auto-focus',
      'store-last-authenticated-user',
      'keep-last-authenticated-user-after-logout',
      'preview',
      'storage-prefix',
      'form',
      'client',
      'validate-on-blur',
      'style-id',
    ];

    BaseDescopeWc.observedAttributes.forEach((attr: string) => {
      if (!optionalAttributes.includes(attr) && !this[camelCase(attr)])
        throw Error(`${attr} cannot be empty`);
    });
  }

  #syncStateIdFromUrl() {
    const { stepId, executionId } = getRunIdsFromUrl();
    this.#flowState.update({ stepId, executionId });
  }

  #createSdk(projectId: string, baseUrl: string) {
    this.sdk = createSdk({
      // Use persist tokens options in order to add existing tokens in outgoing requests (if they exists)
      persistTokens: true,
      preview: this.preview,
      storagePrefix: this.storagePrefix,
      storeLastAuthenticatedUser: this.storeLastAuthenticatedUser,
      keepLastAuthenticatedUserAfterLogout:
        this.keepLastAuthenticatedUserAfterLogout,
      ...BaseDescopeWc.sdkConfigOverrides,
      projectId,
      baseUrl,
    });

    // we are wrapping the next & start function so we can indicate the request status
    ['start', 'next'].forEach((key) => {
      const origFn = this.sdk.flow[key];

      this.sdk.flow[key] = async (...args: Parameters<typeof origFn>) => {
        this.nextRequestStatus.update({ isLoading: true });
        try {
          const resp = await origFn(...args);
          return resp;
        } catch (e) {
          // return a generic error object in case of an error
          return {
            error: {
              errorCode: FETCH_EXCEPTION_ERROR_CODE,
              errorDescription: e.toString(),
            },
          };
        } finally {
          this.nextRequestStatus.update({ isLoading: false });
        }
      };
    });
  }

  async #onFlowChange(
    currentState: FlowState,
    _prevState: FlowState,
    isChanged: IsChanged<FlowState>,
  ) {
    const { projectId, baseUrl } = currentState;

    const shouldCreateSdkInstance =
      isChanged('projectId') || isChanged('baseUrl');

    if (shouldCreateSdkInstance) {
      if (!projectId) return;
      // Initialize the sdk when got a new project id
      this.#createSdk(projectId, baseUrl);
    }

    // update runtime state
    this.#updateExecState(currentState);
  }

  async #getIsFlowsVersionMismatch() {
    const config = await this.getConfig();

    return config.isMissingConfig && (await this.#isPrevVerConfig());
  }

  async #isPrevVerConfig() {
    const prevVerConfigUrl = getContentUrl({
      projectId: this.projectId,
      filename: CONFIG_FILENAME,
      assetsFolder: PREV_VER_ASSETS_FOLDER,
      baseUrl: this.baseStaticUrl,
    });
    try {
      await fetchContent(prevVerConfigUrl, 'json');
      return true;
    } catch (e) {
      return false;
    }
  }

  // we want to get the config only if we don't have it already
  getConfig = withMemCache(async () => {
    const configUrl = getContentUrl({
      projectId: this.projectId,
      filename: CONFIG_FILENAME,
      baseUrl: this.baseStaticUrl,
    });
    try {
      const { body, headers } = await fetchContent(configUrl, 'json');
      return {
        projectConfig: body as ProjectConfiguration,
        executionContext: { geo: headers['x-geo'] },
      };
    } catch (e) {
      return { isMissingConfig: true };
    }
  });

  #handleComponentsContext(e: CustomEvent) {
    this.#componentsContext = { ...this.#componentsContext, ...e.detail };
  }

  get isRestartOnError() {
    return this.getAttribute('restart-on-error') === 'true';
  }

  set isRestartOnError(value: any) {
    this.setAttribute('restart-on-error', value);
  }

  async getExecutionContext() {
    const { executionContext } = await this.getConfig();

    return executionContext;
  }

  #disableDebugger() {
    this.#debuggerEle?.remove();
    this.#debuggerEle = null;
  }

  async #handleDebugMode({ isDebug }) {
    if (isDebug) {
      this.#debuggerEle = document.createElement(
        'descope-debugger',
      ) as HTMLElement & {
        updateData: (data: DebuggerMessage | DebuggerMessage[]) => void;
      };

      Object.assign(this.#debuggerEle.style, {
        position: 'fixed',
        top: '0',
        right: '0',
        height: '100vh',
        width: '100vw',
        pointerEvents: 'none',
        zIndex: 99999,
      });

      // we are importing the debugger dynamically so we won't load it when it's not needed
      await import('../debugger-wc');

      document.body.appendChild(this.#debuggerEle);
    } else {
      this.#disableDebugger();
    }
  }

  #updateDebuggerMessages(title: string, description: string) {
    if (title && this.debug)
      this.#debuggerEle?.updateData({ title, description });
  }

  async getProjectConfig(): Promise<ProjectConfiguration> {
    const { projectConfig } = await this.getConfig();
    return projectConfig;
  }

  async getFlowConfig(): Promise<FlowConfig> {
    const projectConfig = await this.getProjectConfig();

    const flowConfig =
      projectConfig?.flows?.[this.flowId] || ({} as FlowConfig);
    flowConfig.version ??= 0;
    return flowConfig;
  }

  async getTargetLocales() {
    const flowConfig = await this.getFlowConfig();
    return (flowConfig?.targetLocales || []).map((locale: string) =>
      locale.toLowerCase(),
    );
  }

  #handleKeyPress() {
    // we want to simulate submit when the user presses Enter
    this.rootElement.onkeydown = (e) => {
      // we do not want to submit the form if the focus is on a link element
      const isLinkEleFocused =
        !!this.shadowRoot.activeElement?.getAttribute('href');
      const isIgnoredElementFocused = ELEMENTS_TO_IGNORE_ENTER_KEY_ON.includes(
        this.shadowRoot.activeElement?.localName ?? '',
      );

      if (e.key !== 'Enter' || isLinkEleFocused || isIgnoredElementFocused)
        return;

      e.preventDefault();
      const buttons: NodeListOf<HTMLButtonElement> =
        this.rootElement.querySelectorAll('descope-button');

      // in case there is a single button on the page, click on it
      if (
        buttons.length === 1 &&
        buttons[0].getAttribute('auto-submit') !== 'false'
      ) {
        buttons[0].click();
        return;
      }

      const autoSubmitButtons = Array.from(buttons).filter(
        (button) => button.getAttribute('auto-submit') === 'true',
      );
      if (autoSubmitButtons.length === 1) {
        autoSubmitButtons[0].click();
        return;
      }

      const genericButtons = Array.from(buttons).filter(
        (button) => button.getAttribute('data-type') === 'button',
      );

      // in case there is a single "generic" button on the page, click on it
      if (genericButtons.length === 1) {
        if (genericButtons[0].getAttribute('auto-submit') !== 'false') {
          genericButtons[0].click();
        }
      } else if (genericButtons.length === 0) {
        const ssoButtons = Array.from(buttons).filter(
          (button) => button.getAttribute('data-type') === 'sso',
        );

        // in case there is a single "sso" button on the page, click on it
        if (ssoButtons.length === 1) {
          if (ssoButtons[0].getAttribute('auto-submit') !== 'false') {
            ssoButtons[0].click();
          }
        }
      }
    };
  }

  async getComponentsVersion() {
    const version = (await this.getConfig())?.projectConfig?.componentsVersion;

    if (version) return version;

    this.logger.error('Did not get components version, using latest version');

    return 'latest';
  }

  static descopeUI: any;

  async init() {
    this.flowStatus = 'loading';
    ['ready', 'error', 'success'].forEach((status: FlowStatus) =>
      this.addEventListener(status, () => {
        this.flowStatus = status;
      }),
    );

    await super.init?.();
    this.#debugState.subscribe(this.#handleDebugMode.bind(this));
    this.#debugState.update({ isDebug: this.debug });

    this.#validateAttrs();

    if (await this.#getIsFlowsVersionMismatch()) {
      this.loggerWrapper.error(
        'This SDK version does not support your flows version',
        'Make sure to upgrade your flows to the latest version or use an older SDK version',
      );

      return;
    }

    if ((await this.getConfig()).isMissingConfig) {
      this.loggerWrapper.error(
        'Cannot get config file',
        'Make sure that your projectId & flowId are correct',
      );

      return;
    }

    this.#handleKeyPress();

    const {
      executionId,
      stepId,
      token,
      code,
      exchangeError,
      redirectAuthCallbackUrl,
      redirectAuthBackupCallbackUri,
      redirectAuthCodeChallenge,
      redirectAuthInitiator,
      thirdPartyAppId,
      ssoQueryParams,
    } = handleUrlParams();

    // we want to update the state when user clicks on back in the browser
    window.addEventListener('popstate', this.#eventsCbRefs.popstate);

    // adding event to listen to events coming from components (e.g. recaptcha risk token) that want to add data to the context
    // this data will be sent to the server on the next request
    window.addEventListener(
      'components-context',
      this.#eventsCbRefs.componentsContext,
    );

    this.#flowState.subscribe(this.#onFlowChange.bind(this));

    this.#flowState.update({
      projectId: this.projectId,
      flowId: this.flowId,
      baseUrl: this.baseUrl,
      tenant: this.tenant,
      redirectUrl: this.redirectUrl,
      locale: this.locale,
      stepId,
      executionId,
      token,
      code,
      exchangeError,
      redirectAuthCallbackUrl,
      redirectAuthBackupCallbackUri,
      redirectAuthCodeChallenge,
      redirectAuthInitiator,
      thirdPartyAppId,
      ...ssoQueryParams,
    });

    this.#init = true;
  }

  disconnectedCallback() {
    this.#flowState.unsubscribeAll();
    this.#debugState.unsubscribeAll();
    this.#disableDebugger();
    window.removeEventListener('popstate', this.#eventsCbRefs.popstate);
    window.removeEventListener(
      'components-context',
      this.#eventsCbRefs.componentsContext,
    );
  }

  attributeChangedCallback(
    attrName: string,
    oldValue: string,
    newValue: string,
  ) {
    if (!this.shadowRoot.isConnected || !this.#init) return;

    if (
      oldValue !== newValue &&
      BaseDescopeWc.observedAttributes.includes(attrName)
    ) {
      this.#validateAttrs();

      const isInitialRun = oldValue === null;

      this.#flowState.update(({ stepId, executionId }) => {
        let newStepId = stepId;
        let newExecutionId = executionId;

        // If not initial run and we got a new project/flow, we want to restart the step
        if (!isInitialRun) {
          newExecutionId = null;
          newStepId = null;
          clearRunIdsFromUrl();
        }

        return {
          [camelCase(attrName)]: newValue,
          stepId: newStepId,
          executionId: newExecutionId,
        };
      });

      this.#debugState.update({ isDebug: this.debug });
    }
  }
}

export default BaseDescopeWc;
