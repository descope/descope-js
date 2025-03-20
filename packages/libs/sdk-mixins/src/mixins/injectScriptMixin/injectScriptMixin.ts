import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import { configMixin } from '../configMixin';
import { loggerMixin } from '../loggerMixin';
import {
  BASE_CDN_URL,
  BASE_CDN_URL_FALLBACK,
  BASE_CDN_URL_FALLBACK_2,
  DESCOPE_UI_FALLBACK_2_SCRIPT_ID,
  DESCOPE_UI_FALLBACK_SCRIPT_ID,
} from './constants';
import { setupScript } from './helpers';
import { IS_LOCAL_STORAGE } from '../../constants';

declare global {
  var descope: any;
}

type ErrorCb = (error: string) => void;
type LoadCb = () => void;

export const injectScriptMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) => {
    const BaseClass = compose(loggerMixin, configMixin)(superclass);

    return class DescopeUiMixinClass extends BaseClass {
      #errorCbsSym = Symbol('errorCbs');

      #loadCbsSym = Symbol('loadCbs');

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

      async #handleFallbackScript(
        errorCbs: ErrorCb[],
        loadCbs: LoadCb[],
        elemId: string,
        scriptUrl: string,
      ) {
        this.logger.debug('Trying to load DescopeUI from a fallback URL');
        const fallbackScriptEle = setupScript(elemId);
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

        fallbackScriptEle.src = scriptUrl;
      }

      #registerEvents(scriptEle: HTMLScriptElement, path: string) {
        scriptEle.addEventListener('error', () => {
          scriptEle[this.#errorCbsSym].forEach((cb: ErrorCb) =>
            cb(
              `Cannot load script from main URL, Make sure this URL is valid and return the correct script: "${scriptEle.src}"`,
            ),
          );

          // in case we could not load DescopeUI from the main URL, we are trying to load it from a fallback URL
          this.#handleFallbackScript(
            [
              // we are adding a second fallback
              this.#handleFallbackScript.bind(
                this,
                scriptEle[this.#errorCbsSym],
                scriptEle[this.#loadCbsSym],
                DESCOPE_UI_FALLBACK_2_SCRIPT_ID,
                new URL(path, BASE_CDN_URL_FALLBACK_2).href,
              ),
              ...scriptEle[this.#errorCbsSym],
            ],
            scriptEle[this.#loadCbsSym],
            DESCOPE_UI_FALLBACK_SCRIPT_ID,
            new URL(path, BASE_CDN_URL_FALLBACK).href,
          );
        });

        scriptEle.addEventListener('load', () => {
          scriptEle[this.#loadCbsSym].forEach((cb: LoadCb) => cb());
        });
      }

      async registerScript(scriptId: string, path: string, localKey?: string) {
        return new Promise((res, rej) => {
          if (!document.querySelector(`script#${scriptId}`)) {
            this.logger.debug(
              'DescopeUI loading script does not exist, creating it',
              this,
            );

            const scriptEle = setupScript(scriptId);

            document.body.append(scriptEle);

            this.#exposeAlternateEvents(scriptEle);
            this.#registerEvents(scriptEle, path);

            scriptEle.onerror = (error) => {
              scriptEle.setAttribute('status', 'error');
              rej(error);
            };
            scriptEle.onload = () => {
              scriptEle.setAttribute('status', 'loaded');
              res(scriptEle);
            };

            if (
              IS_LOCAL_STORAGE &&
              localKey &&
              localStorage.getItem(localKey)
            ) {
              scriptEle.src = localStorage.getItem(localKey);
            } else if (this.baseCdnUrl) {
              const url = new URL(this.baseCdnUrl);
              if (url.pathname === '/') {
                scriptEle.src = new URL(
                  path,
                  url.protocol + '//' + url.host + '/',
                ).href;
              } else {
                scriptEle.src = url.href;
              }
            } else {
              scriptEle.src = new URL(path, BASE_CDN_URL).href;
            }
          } else {
            this.logger.debug(
              `Script with id ${scriptId} already exists`,
              this,
            );
            const existingScript = document.getElementById(scriptId);

            const fn =
              existingScript.getAttribute('status') === 'loaded' ? res : rej;
            fn(existingScript);
          }
        });
      }

      get baseCdnUrl() {
        return this.getAttribute('base-cdn-url');
      }
    };
  },
);
