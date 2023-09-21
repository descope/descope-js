import createSdk from '@descope/web-js-sdk';
import {
  CONFIG_FILENAME,
  PREV_VER_ASSETS_FOLDER,
  THEME_FILENAME,
  UI_COMPONENTS_URL,
  UI_COMPONENTS_URL_VERSION_PLACEHOLDER,
} from '../constants';
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
  ILogger,
  SdkConfig,
  ThemeOptions,
  DescopeUI,
  ProjectConfiguration,
  FlowConfig,
} from '../types';
import initTemplate from './initTemplate';

// this is replaced in build time
declare const BUILD_VERSION: string;

// this base class is responsible for WC initialization
class BaseDescopeWc extends HTMLElement {
  logger: ILogger = console;

  static get observedAttributes() {
    return [
      'project-id',
      'flow-id',
      'base-url',
      'tenant',
      'theme',
      'locale',
      'debug',
      'storage-prefix',
      'preview',
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
  };

  #flowState = new State<FlowState>({ deferredRedirect: false } as FlowState);

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
    visibilitychange: this.#syncStateWithVisibility.bind(this),
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

  get locale() {
    return this.getAttribute('locale') || undefined;
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

  get storagePrefix() {
    return this.getAttribute('storage-prefix') || '';
  }

  get preview() {
    return !!this.getAttribute('preview');
  }

  #validateAttrs() {
    const optionalAttributes = [
      'base-url',
      'tenant',
      'theme',
      'locale',
      'debug',
      'telemetryKey',
      'redirect-url',
      'auto-focus',
      'preview',
      'storage-prefix',
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
      preview: this.preview,
      storagePrefix: this.storagePrefix,
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

  async #getIsFlowsVersionMismatch() {
    const config = await this.#getConfig();

    return config.isMissingConfig && (await this.#isPrevVerConfig());
  }

  async #isPrevVerConfig() {
    const prevVerConfigUrl = getContentUrl(
      this.projectId,
      CONFIG_FILENAME,
      PREV_VER_ASSETS_FOLDER
    );
    try {
      await fetchContent(prevVerConfigUrl, 'json');
      return true;
    } catch (e) {
      return false;
    }
  }

  // we want to get the config only if we don't have it already
  #getConfig = withMemCache(async () => {
    const configUrl = getContentUrl(this.projectId, CONFIG_FILENAME);
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

  async #loadFonts() {
    const { projectConfig } = await this.#getConfig();
    const fonts = projectConfig?.cssTemplate?.[this.theme]?.fonts;
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    fonts &&
      Object.values(fonts).forEach((font: Record<string, any>) =>
        loadFont(font.url)
      );
  }

  async #handleTheme() {
    await this.#loadTheme();
    await this.#applyTheme();
  }

  async #loadTheme() {
    const styleEle = document.createElement('style');
    const themeUrl = getContentUrl(this.projectId, THEME_FILENAME);
    try {
      const { body: theme } = await fetchContent(themeUrl, 'json');
      styleEle.innerText =
        (theme?.light?.globals || '') + (theme?.dark?.globals || '');

      const descopeUi = await this.descopeUI;
      if (descopeUi?.componentsThemeManager) {
        descopeUi.componentsThemeManager.themes = {
          light: theme?.light?.components,
          dark: theme?.dark?.components,
        };
      }
    } catch (e) {
      this.loggerWrapper.error(
        'Cannot fetch theme file',
        'make sure that your projectId & flowId are correct'
      );
    }
    this.shadowRoot.appendChild(styleEle);
  }

  #handleComponentsContext(e: CustomEvent) {
    this.#componentsContext = { ...e.detail, ...this.#componentsContext };
  }

  async #applyTheme() {
    this.rootElement.setAttribute('data-theme', this.theme);
    const descopeUi = await this.descopeUI;
    if (descopeUi?.componentsThemeManager) {
      descopeUi.componentsThemeManager.currentThemeName = this.theme;
    }
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
    const { projectConfig } = await this.#getConfig();
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
      locale.toLowerCase()
    );
  }

  #handleKeyPress() {
    // we want to simulate submit when the user presses Enter
    this.rootElement.onkeydown = (e) => {
      if (e.key !== 'Enter') return;

      e.preventDefault();
      const buttons: NodeListOf<HTMLButtonElement> =
        this.rootElement.querySelectorAll('descope-button');

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

  async #loadDescopeUI() {
    let version = (await this.#getConfig())?.projectConfig?.componentsVersion;

    if (!version) {
      this.logger.error('Did not get components version, using latest version');
      version = 'latest';
    }

    const scriptSrc = UI_COMPONENTS_URL.replace(
      UI_COMPONENTS_URL_VERSION_PLACEHOLDER,
      version
    );
    const scriptEle = document.createElement('script');

    this.descopeUI = new Promise((res) => {
      const onError = () => {
        this.loggerWrapper.error(
          'Cannot load DescopeUI',
          `Make sure this URL is valid and return the correct script: "${scriptSrc}"`
        );

        res({} as DescopeUI);
      };

      scriptEle.onload = () => {
        if (!globalThis.DescopeUI) onError();
        res(globalThis.DescopeUI);
      };

      scriptEle.onerror = onError;

      scriptEle.src = scriptSrc;
    });

    document.body.append(scriptEle);
  }

  async connectedCallback() {
    if (this.shadowRoot.isConnected) {
      this.#debugState.subscribe(this.#handleDebugMode.bind(this));
      this.#debugState.update({ isDebug: this.debug });

      if (this.#shouldMountInFormEle()) {
        this.#handleOuterForm();
        return;
      }

      this.#validateAttrs();

      if (await this.#getIsFlowsVersionMismatch()) {
        this.loggerWrapper.error(
          'This SDK version does not support your flows version',
          'Make sure to upgrade your flows to the latest version or use an older SDK version'
        );

        return;
      }

      if ((await this.#getConfig()).isMissingConfig) {
        this.loggerWrapper.error(
          'Cannot get config file',
          'Make sure that your projectId & flowId are correct'
        );

        return;
      }

      await this.#loadDescopeUI();

      await this.#handleTheme();

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

      // adding event to listen to events coming from components (e.g. recaptcha risk token) that want to add data to the context
      // this data will be sent to the server on the next request
      window.addEventListener(
        'components-context',
        this.#eventsCbRefs.componentsContext
      );

      window.addEventListener(
        'visibilitychange',
        this.#eventsCbRefs.visibilitychange
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
        telemetryKey: this.telemetryKey,
        redirectAuthCallbackUrl,
        redirectAuthCodeChallenge,
        redirectAuthInitiator,
        oidcIdpStateId,
        samlIdpStateId,
        samlIdpUsername,
        ssoAppId,
      });

      this.#init = true;
    }
  }

  disconnectedCallback() {
    this.#flowState.unsubscribeAll();
    this.#debugState.unsubscribeAll();
    this.#disableDebugger();
    window.removeEventListener('popstate', this.#eventsCbRefs.popstate);
    window.removeEventListener(
      'visibilitychange',
      this.#eventsCbRefs.visibilitychange
    );
    window.removeEventListener(
      'components-context',
      this.#eventsCbRefs.componentsContext
    );
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
