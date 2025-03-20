import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import { configMixin } from '../configMixin';
import { injectScriptMixin } from '../injectScriptMixin';
import { loggerMixin } from '../loggerMixin';
import { generateScriptPath, getDescopeUiComponentsList } from './helpers';
import {
  DESCOPE_UI_SCRIPT_ID,
  UI_COMPONENT_URL_PATH,
  UI_COMPONENTS_URL_KEY,
} from './constants';

export const descopeUiMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) => {
    const BaseClass = compose(
      loggerMixin,
      configMixin,
      injectScriptMixin,
    )(superclass);

    return class DescopeUiMixinClass extends BaseClass {
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

      #getDescopeUi() {
        return new Promise(async (res, rej) => {
          if (globalThis.DescopeUI) {
            return globalThis.DescopeUI;
          }

          this.registerScript(
            DESCOPE_UI_SCRIPT_ID,
            generateScriptPath(
              UI_COMPONENT_URL_PATH,
              await this.#getComponentsVersion(),
            ),
            UI_COMPONENTS_URL_KEY,
          ).then(
            () => {
              this.logger.debug('DescopeUI was loaded');
              return globalThis.DescopeUI;
            },
            (error) => {
              this.logger.error(error);
              rej(error);
            },
          );

          // in case the load event was dispatched before we registered, we have a fallback
          setTimeout(() => {
            if (globalThis.DescopeUI) {
              res(globalThis.DescopeUI);
            }
          });
        });
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
    };
  },
);
