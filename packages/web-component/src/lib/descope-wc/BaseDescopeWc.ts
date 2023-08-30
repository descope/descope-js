import createSdk from '@descope/web-js-sdk';
import { CONFIG_FILENAME, THEME_FILENAME } from '../constants';
import {
  camelCase,
  clearRunIdsFromUrl,
  fetchContent,
  getContentUrl,
  getRunIdsFromUrl,
  handleUrlParams,
  isChromium,
  loadFont,
  State,
  withMemCache,
} from '../helpers';
import { IsChanged } from '../helpers/state';
import {
  AutoFocusOptions,
  DebuggerMessage,
  DebugState,
  FlowState,
  FlowStateUpdateFn,
  SdkConfig,
  ThemeOptions,
} from '../types';
import initTemplate from './initTemplate';

// this is replaced in build time
declare const BUILD_VERSION: string;

// this base class is responsible for WC initialization
class BaseDescopeWc extends HTMLElement {
  static get observedAttributes() {
    return [
      'project-id',
      'flow-id',
      'base-url',
      'tenant',
      'theme',
      'debug',
      'telemetryKey',
      'redirect-url',
      'auto-focus',
      'prefer-biometrics',
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

  #flowState = new State<FlowState>({ deferredRedirect: false } as FlowState);

  #debugState = new State<DebugState>();

  nextRequestStatus = new State<{ isLoading: boolean }>({ isLoading: false });

  rootElement: HTMLDivElement;

  #debuggerEle: HTMLElement & {
    updateData: (data: DebuggerMessage | DebuggerMessage[]) => void;
  };

  #eventsCbRefs = {
    popstate: this.#syncStateIdFromUrl.bind(this),
    visibilitychange: this.#syncStateWithVisibility.bind(this),
  };

  sdk: ReturnType<typeof createSdk>;

  #updateExecState: FlowStateUpdateFn;

  constructor(updateExecState: FlowStateUpdateFn) {
    super();
    this.#updateExecState = updateExecState;

    this.#initShadowDom();
  }

  #initShadowDom() {
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(initTemplate.content.cloneNode(true));

    this.rootElement =
      this.shadowRoot.querySelector<HTMLDivElement>('#wc-root');
  }

  #shouldMountInFormEle() {
    const wc = this.shadowRoot.host;
    return !wc.closest('form') && isChromium();
  }

  // we want to make sure the web-component is wrapped with on outer form element
  // this is needed in order to support webauthn conditional UI (which currently supported only in Chrome when input is inside a web-component)
  // for more info see here: https://github.com/descope/etc/issues/733
  #handleOuterForm() {
    const wc = this.shadowRoot.host;
    const form = document.createElement('form');
    wc.parentElement.appendChild(form);
    form.appendChild(wc);
  }

  get projectId() {
    return this.getAttribute('project-id');
  }

  get flowId() {
    return this.getAttribute('flow-id');
  }

  get baseUrl() {
    return this.getAttribute('base-url') || undefined;
  }

  get tenant() {
    return this.getAttribute('tenant') || undefined;
  }

  get redirectUrl() {
    return this.getAttribute('redirect-url') || undefined;
  }

  get debug() {
    return this.getAttribute('debug') === 'true';
  }

  get theme(): ThemeOptions {
    const theme = this.getAttribute('theme') as ThemeOptions;

    if (theme === 'os') {
      const isOsDark =
        window.matchMedia &&
        window.matchMedia?.('(prefers-color-scheme: dark)')?.matches;
      return isOsDark ? 'dark' : 'light';
    }

    return theme || 'light';
  }

  get telemetryKey() {
    return this.getAttribute('telemetryKey') || undefined;
  }

  get autoFocus(): AutoFocusOptions {
    const res = this.getAttribute('auto-focus') ?? 'true';
    if (res === 'skipFirstScreen') {
      return res;
    }
    return res === 'true';
  }

  get preferBiometrics(): boolean {
    const res = this.getAttribute('prefer-biometrics') ?? 'true';
    return res === 'true';
  }

  #validateAttrs() {
    const optionalAttributes = [
      'base-url',
      'tenant',
      'theme',
      'debug',
      'telemetryKey',
      'redirect-url',
      'auto-focus',
      'prefer-biometrics',
    ];

    BaseDescopeWc.observedAttributes.forEach((attr: string) => {
      if (!optionalAttributes.includes(attr) && !this[camelCase(attr)])
        throw Error(`${attr} cannot be empty`);
    });

    if (this.theme && this.theme !== 'light' && this.theme !== 'dark') {
      throw Error(
        'Supported theme values are "light", "dark", or leave empty for using the OS theme'
      );
    }
  }

  #syncStateIdFromUrl() {
    const { stepId, executionId } = getRunIdsFromUrl();
    this.#flowState.update({ stepId, executionId });
  }

  #syncStateWithVisibility() {
    if (!document.hidden) {
      // Defer the update a bit, it won't work otherwise
      setTimeout(() => {
        // Trigger state update that will redirect and pending deferred redirection
        this.#flowState.update({ deferredRedirect: false });
      }, 300);
    }
  }

  #createSdk(projectId: string, baseUrl: string, telemetryKey: string) {
    const fpKey = telemetryKey || undefined;
    const fpLoad = !!fpKey;
    this.sdk = createSdk({
      // Use persist tokens options in order to add existing tokens in outgoing requests (if they exists)
      persistTokens: true,
      ...BaseDescopeWc.sdkConfigOverrides,
      projectId,
      baseUrl,
      fpKey,
      fpLoad,
    });

    // we are wrapping the next & start function so we can indicate the request status
    ['start', 'next'].forEach((key) => {
      const origFn = this.sdk.flow[key];

      this.sdk.flow[key] = async (...args: Parameters<typeof origFn>) => {
        this.nextRequestStatus.update({ isLoading: true });
        try {
          const resp = await origFn(...args);
          return resp;
        } finally {
          this.nextRequestStatus.update({ isLoading: false });
        }
      };
    });
  }

  async #onFlowChange(
    currentState: FlowState,
    _prevState: FlowState,
    isChanged: IsChanged<FlowState>
  ) {
    const { projectId, baseUrl, telemetryKey } = currentState;

    const shouldCreateSdkInstance =
      isChanged('projectId') ||
      isChanged('baseUrl') ||
      isChanged('telemetryKey');

    if (shouldCreateSdkInstance) {
      if (!projectId) return;
      // Initialize the sdk when got a new project id
      this.#createSdk(projectId, baseUrl, telemetryKey);
    }

    // update runtime state
    this.#updateExecState(currentState);
  }

  // we want to get the config only if we don't have it already
  #getConfig = withMemCache(async () => {
    const configUrl = getContentUrl(this.projectId, CONFIG_FILENAME);
    try {
      const { body, headers } = await fetchContent(configUrl, 'json');
      return {
        projectConfig: body,
        executionContext: { geo: headers['x-geo'] },
      };
    } catch (e) {
      this.logger.error(
        'Cannot get config file',
        'make sure that your projectId & flowId are correct'
      );
    }

    return {};
  });

  async #loadFonts() {
    const { projectConfig } = await this.#getConfig();
    projectConfig?.cssTemplate?.[this.theme]?.typography?.fontFamilies?.forEach(
      (font: Record<string, any>) => loadFont(font.url)
    );
  }

  #handleTheme() {
    this.#loadTheme();
    this.#applyTheme();
  }

  async #loadTheme() {
    const styleEle = document.createElement('style');
    const themeUrl = getContentUrl(this.projectId, THEME_FILENAME);
    try {
      const { body } = await fetchContent(themeUrl, 'text');
      styleEle.innerText = body;
    } catch (e) {
      this.logger.error(
        'Cannot fetch theme file',
        'make sure that your projectId & flowId are correct'
      );
    }
    this.shadowRoot.appendChild(styleEle);
  }

  #applyTheme() {
    this.rootElement.setAttribute('data-theme', this.theme);
  }

  async getExecutionContext() {
    const { executionContext } = await this.#getConfig();

    return executionContext;
  }

  #disableDebugger() {
    this.#debuggerEle?.remove();
    this.#debuggerEle = null;
  }

  async #handleDebugMode({ isDebug }) {
    if (isDebug) {
      // we are importing the debugger dynamically so we won't load it when it's not needed
      await import('../debugger-wc');

      this.#debuggerEle = document.createElement(
        'descope-debugger'
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

      document.body.appendChild(this.#debuggerEle);
    } else {
      this.#disableDebugger();
    }
  }

  #updateDebuggerMessages(title: string, description: string) {
    if (title && this.debug)
      this.#debuggerEle?.updateData({ title, description });
  }

  async getFlowConfig() {
    const { projectConfig } = await this.#getConfig();

    const config = projectConfig?.flows?.[this.flowId] || {};
    config.version ??= 0;
    return config;
  }

  logger = {
    error: (message: string, description = '') => {
      // eslint-disable-next-line no-console
      console.error(message, description, new Error());
      this.#updateDebuggerMessages(message, description);
    },
    info: (message: string, description = '') => {
      // eslint-disable-next-line no-console
      console.log(message, description);
    },
  };

  #handleKeyPress() {
    // we want to simulate submit when the user presses Enter
    this.rootElement.onkeydown = (e) => {
      if (e.key !== 'Enter') return;

      e.preventDefault();
      const buttons = this.rootElement.querySelectorAll('button');

      // in case there is a single button on the page, click on it
      if (buttons.length === 1) {
        buttons[0].click();
        return;
      }

      const genericButtons = Array.from(buttons).filter(
        (button) => button.getAttribute('data-type') === 'button'
      );

      // in case there is a single "generic" button on the page, click on it
      if (genericButtons.length === 1) {
        genericButtons[0].click();
      }
    };
  }

  async connectedCallback() {
    if (this.shadowRoot.isConnected) {
      if (this.#shouldMountInFormEle()) {
        this.#handleOuterForm();
        return;
      }

      this.#validateAttrs();

      this.#handleTheme();

      this.#loadFonts();

      this.#handleKeyPress();

      const {
        executionId,
        stepId,
        token,
        code,
        exchangeError,
        redirectAuthCallbackUrl,
        redirectAuthCodeChallenge,
        redirectAuthInitiator,
        oidcIdpStateId,
        samlIdpStateId,
        samlIdpUsername,
        ssoAppId,
      } = handleUrlParams();

      // we want to update the state when user clicks on back in the browser
      window.addEventListener('popstate', this.#eventsCbRefs.popstate);

      window.addEventListener(
        'visibilitychange',
        this.#eventsCbRefs.visibilitychange
      );

      this.#flowState.subscribe(this.#onFlowChange.bind(this));
      this.#debugState.subscribe(this.#handleDebugMode.bind(this));

      this.#flowState.update({
        projectId: this.projectId,
        flowId: this.flowId,
        baseUrl: this.baseUrl,
        tenant: this.tenant,
        redirectUrl: this.redirectUrl,
        stepId,
        executionId,
        token,
        code,
        exchangeError,
        telemetryKey: this.telemetryKey,
        redirectAuthCallbackUrl,
        redirectAuthCodeChallenge,
        redirectAuthInitiator,
        oidcIdpStateId,
        samlIdpStateId,
        samlIdpUsername,
        ssoAppId,
      });

      this.#debugState.update({ isDebug: this.debug });

      this.#init = true;
    }
  }

  disconnectedCallback() {
    this.#flowState.unsubscribeAll();
    this.#debugState.unsubscribeAll();
    this.#disableDebugger();
    window.removeEventListener('popstate', this.#eventsCbRefs.popstate);
  }

  attributeChangedCallback(
    attrName: string,
    oldValue: string,
    newValue: string
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
