import { compose } from '../../helpers/compose';
import { createSingletonMixin } from '../../helpers/mixins';
import { configMixin } from '../configMixin';
import { loggerMixin } from '../loggerMixin';
import {
  DESCOPE_UI_FALLBACK_SCRIPT_ID,
  DESCOPE_UI_SCRIPT_ID,
  UI_COMPONENTS_FALLBACK_URL,
  UI_COMPONENTS_URL,
} from './constants';
import {
  generateScriptUrl,
  getDescopeUiComponentsList,
  setupScript,
} from './helpers';

type ErrorCb = (error: string) => void;
type LoadCb = () => void;

export const descopeUiMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) => {
    const BaseClass = compose(loggerMixin, configMixin)(superclass);

    return class DescopeUiMixinClass extends BaseClass {
      #errorCbsSym = Symbol('errorCbs');

      #loadCbsSym = Symbol('loadCbs');

      // eslint-disable-next-line class-methods-use-this
      async #getComponentsVersion() {
        const config = await this.config;
        const componentsVersion = config?.projectConfig?.componentsVersion;

        if (!componentsVersion) {
          this.logger.error('Could not get components version');
        } else {
          this.logger.debug(`Got component version "${componentsVersion}"`);
        }

        return componentsVersion;
      }

      // in order to allow only single load of DescopeUI across different instances,
      // and also allow fallback in case the components cannot be loaded from descope domain
      // we are managing an alternative way to register to the script events
      #exposeAlternateEvents(scriptEle: HTMLScriptElement) {
        const errorCbsSym = this.#errorCbsSym;
        const loadCbsSym = this.#loadCbsSym;

        // eslint-disable-next-line no-param-reassign
        scriptEle[errorCbsSym] = [];
        // eslint-disable-next-line no-param-reassign
        scriptEle[loadCbsSym] = [];

        Object.defineProperty(scriptEle, 'onerror', {
          set(cb: ErrorCb) {
            scriptEle[errorCbsSym].push(cb);
          },
        });

        Object.defineProperty(scriptEle, 'onload', {
          set(cb: LoadCb) {
            scriptEle[loadCbsSym].push(cb);
          },
        });
      }

      async #handleFallbackScript(errorCbs: ErrorCb[], loadCbs: LoadCb[]) {
        this.logger.debug('Trying to load DescopeUI from a fallback URL');
        const fallbackScriptEle = setupScript(DESCOPE_UI_FALLBACK_SCRIPT_ID);
        document.body.append(fallbackScriptEle);

        fallbackScriptEle.addEventListener('error', () => {
          errorCbs.forEach((cb: ErrorCb) =>
            cb(
              `Cannot load DescopeUI from fallback URL, Make sure this URL is valid and return the correct script: "${fallbackScriptEle.src}"`,
            ),
          );
        });

        fallbackScriptEle.addEventListener('load', () => {
          loadCbs.forEach((cb: LoadCb) => cb());
        });

        fallbackScriptEle.src = generateScriptUrl(
          UI_COMPONENTS_FALLBACK_URL,
          await this.#getComponentsVersion(),
        );
      }

      #registerEvents(scriptEle: HTMLScriptElement) {
        scriptEle.addEventListener('error', () => {
          scriptEle[this.#errorCbsSym].forEach((cb: ErrorCb) =>
            cb(
              `Cannot load DescopeUI from main URL, Make sure this URL is valid and return the correct script: "${scriptEle.src}"`,
            ),
          );

          // in case we could not load DescopeUI from the main URL, we are trying to load it from a fallback URL
          this.#handleFallbackScript(
            scriptEle[this.#errorCbsSym],
            scriptEle[this.#loadCbsSym],
          );
        });

        scriptEle.addEventListener('load', () => {
          scriptEle[this.#loadCbsSym].forEach((cb: LoadCb) => cb());
        });
      }

      async #getDescopeUiLoadingScript() {
        if (!document.getElementById(DESCOPE_UI_SCRIPT_ID)) {
          this.logger.debug(
            'DescopeUI loading script does not exist, creating it',
            this,
          );

          const scriptEle = setupScript(DESCOPE_UI_SCRIPT_ID);

          document.body.append(scriptEle);

          this.#exposeAlternateEvents(scriptEle);
          this.#registerEvents(scriptEle);

          scriptEle.src = generateScriptUrl(
            UI_COMPONENTS_URL,
            await this.#getComponentsVersion(),
          );
        } else {
          this.logger.debug('DescopeUI loading script already exists', this);
        }

        return document.getElementById(DESCOPE_UI_SCRIPT_ID);
      }

      #descopeUi: Promise<any>;

      get descopeUi() {
        if (!this.#descopeUi) {
          this.#descopeUi = this.#getDescopeUi();
        }

        return this.#descopeUi;
      }

      async #loadDescopeUiComponent(componentName: string) {
        const isComponentAlreadyDefined = !!customElements.get(componentName);

        if (isComponentAlreadyDefined) {
          this.logger.debug(
            `Loading component "${componentName}" is skipped as it is already defined`,
          );
          return undefined;
        }

        const descopeUI = await this.descopeUi;

        if (!descopeUI[componentName]) {
          this.logger.error(
            `Cannot load UI component "${componentName}"`,
            `Descope UI does not have a component named "${componentName}", available components are: "${Object.keys(
              descopeUI,
            ).join(', ')}"`,
          );
          return undefined;
        }

        try {
          // eslint-disable-next-line @typescript-eslint/return-await
          return await descopeUI[componentName]();
        } catch (e) {
          // this error is thrown when trying to register a component which is already registered
          // when running 2 flows on the same page, it might happen that the register fn is called twice
          // in case it happens, we are silently ignore the error
          if (e.name === 'NotSupportedError') {
            // eslint-disable-next-line no-console
            console.debug(
              `Encountered an error while attempting to define the "${componentName}" component, it is likely that this component is already defined`,
            );
          } else {
            throw e;
          }
        }

        return undefined;
      }

      async loadDescopeUiComponents(
        templateOrComponentNames: HTMLTemplateElement | string[],
      ) {
        const descopeUiComponentsList = Array.isArray(templateOrComponentNames)
          ? templateOrComponentNames
          : getDescopeUiComponentsList(templateOrComponentNames);

        return Promise.all(
          descopeUiComponentsList.map((componentName: string) =>
            this.#loadDescopeUiComponent(componentName),
          ),
        );
      }

      #getDescopeUi() {
        return new Promise((res) => {
          if (globalThis.DescopeUI) {
            res(globalThis.DescopeUI);
          }

          this.#getDescopeUiLoadingScript().then((scriptEle) => {
            // eslint-disable-next-line no-param-reassign
            scriptEle!.onerror = this.logger.error;
            // eslint-disable-next-line no-param-reassign
            scriptEle!.onload = () => {
              this.logger.debug('DescopeUI was loaded');
              res(globalThis.DescopeUI);
            };

            // in case the load event was dispatched before we registered, we have a fallback
            setTimeout(() => {
              if (globalThis.DescopeUI) {
                res(globalThis.DescopeUI);
              }
            });
          });
        });
      }
    };
  },
);
