import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import {
  baseUrlMixin,
  cookieConfigMixin,
  DEFAULT_STYLE_ID,
  loggerMixin,
  observeAttributesMixin,
  projectIdMixin,
} from '@descope/sdk-mixins';
import { Sdk, createSdk } from '../api/sdk';

export const apiMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) => {
    const BaseClass = compose(
      projectIdMixin,
      observeAttributesMixin,
      loggerMixin,
      cookieConfigMixin,
      baseUrlMixin,
    )(superclass);

    return class ApiMixinClass extends BaseClass {
      #api: Sdk;

      #createSdk() {
        this.logger.debug('creating an sdk instance');
        this.#api = createSdk(
          {
            projectId: this.projectId,
            baseUrl: this.baseUrl,
            refreshCookieName: this.refreshCookieName,
          },
          this.mock === 'true',
          this.widgetId,
        );
      }

      get tenantId() {
        return this.getAttribute('tenant');
      }

      get widgetId() {
        return this.getAttribute('widget-id');
      }

      get mock() {
        return this.getAttribute('mock');
      }

      get styleId() {
        return this.getAttribute('style-id') || DEFAULT_STYLE_ID;
      }

      get api() {
        if (!this.#api) {
          this.#createSdk();
        }

        return this.#api;
      }

      async init() {
        await super.init?.();

        this.observeAttributes(['project-id', 'base-url'], () => {
          if (this.#api) {
            this.#createSdk();
          }
        });
      }
    };
  },
);
