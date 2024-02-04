/* eslint-disable no-underscore-dangle */
import { compose } from '../../helpers/compose';
import { createSingletonMixin } from '../../helpers/mixins';
import { staticResourcesMixin } from '../staticResourcesMixin';
import { CONFIG_FILENAME } from './constants';
import { ProjectConfiguration } from './types';

export const configMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) => {
    const BaseClass = compose(staticResourcesMixin)(superclass);

    return class ConfigMixinClass extends BaseClass {
      get config() {
        if (!this.#_configResource) {
          this.#_configResource = this.#fetchConfig();
        }

        return this.#_configResource;
      }

      #_configResource;

      #fetchConfig = async () => {
        try {
          const { body, headers } = await this.fetchStaticResource(
            CONFIG_FILENAME,
            'json',
          );
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
