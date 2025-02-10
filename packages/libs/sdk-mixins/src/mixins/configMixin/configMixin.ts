/* eslint-disable no-underscore-dangle */
import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import { staticResourcesMixin } from '../staticResourcesMixin';
import { CONFIG_FILENAME } from './constants';
import { Config, ProjectConfiguration } from './types';
import { resetMixin } from '../resetMixin';
import { initLifecycleMixin } from '../initLifecycleMixin';

export const configMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) => {
    const BaseClass = compose(
      staticResourcesMixin,
      resetMixin,
      initLifecycleMixin,
    )(superclass);

    return class ConfigMixinClass extends BaseClass {
      async init() {
        await super.init();
        this.onReset('config', this.#configCacheClear.bind(this));
      }

      get config() {
        if (!this.#_configResource) {
          this.#_configResource = this.#fetchConfig();
        }

        return this.#_configResource;
      }

      #configCacheClear() {
        this.#_configResource = undefined;
      }

      #_configResource: Promise<Config>;

      #fetchConfig: () => Promise<Config> = async () => {
        try {
          const {
            body,
            headers,
          }: { body: ProjectConfiguration; headers: Record<string, any> } =
            await (<any>this.fetchStaticResource(CONFIG_FILENAME, 'json'));
          return {
            projectConfig: body as ProjectConfiguration,
            executionContext: { geo: headers['x-geo'] },
          };
        } catch (e) {
          this.logger.error(
            'Cannot fetch config file',
            'make sure that your projectId & flowId are correct',
          );
        }

        return undefined;
      };
    };
  },
);
