import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import {
  baseUrlMixin,
  cookieConfigMixin,
  DEFAULT_STYLE_ID,
  loggerMixin,
  observeAttributesMixin,
  projectIdMixin,
} from '@descope/sdk-mixins';
import type { CookieConfig } from '@descope/web-js-sdk';
import { Sdk, createSdk } from '../api/sdk';

export const apiMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) => {
    const BaseClass = compose(
      projectIdMixin,
      observeAttributesMixin,
      loggerMixin,
      baseUrlMixin,
      cookieConfigMixin,
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
            sessionTokenViaCookie: this.sessionTokenViaCookie,
            refreshTokenViaCookie: this.refreshTokenViaCookie,
          },
          this.mock === 'true',
          this.widgetId,
        );
      }

      #getCookieConfig(attrName: string): CookieConfig | undefined {
        try {
          return JSON.parse(this.getAttribute(attrName)) ?? undefined;
        } catch (e) {
          this.logger.warn(
            `invalid JSON in "${attrName}" attribute, ignoring it`,
          );
          return undefined;
        }
      }

      // same as the AuthProvider's sessionTokenViaCookie, as a JSON string
      get sessionTokenViaCookie() {
        return this.#getCookieConfig('session-token-via-cookie');
      }

      // same as the AuthProvider's refreshTokenViaCookie, as a JSON string
      get refreshTokenViaCookie() {
        return this.#getCookieConfig('refresh-token-via-cookie');
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

        this.observeAttributes(
          [
            'project-id',
            'base-url',
            'session-token-via-cookie',
            'refresh-token-via-cookie',
          ],
          () => {
            if (this.#api) {
              this.#createSdk();
            }
          },
        );
      }
    };
  },
);
