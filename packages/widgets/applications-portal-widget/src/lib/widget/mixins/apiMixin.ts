import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import {
  baseUrlMixin,
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
      baseUrlMixin,
    )(superclass);

    return class ApiMixinClass extends BaseClass {
      #api: Sdk;

      #createSdk() {
        this.logger.debug('creating an sdk instance');
        this.#api = createSdk(
          { projectId: this.projectId, baseUrl: this.baseUrl },
          this.mock === 'true',
          this.widgetId,
        );
      }

      get widgetId() {
        return this.getAttribute('widget-id');
      }

      get mock() {
        return this.getAttribute('mock');
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
