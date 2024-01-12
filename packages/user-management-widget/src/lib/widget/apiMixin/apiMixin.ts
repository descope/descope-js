import { compose } from '../../helpers/compose';
import { createSingletonMixin } from '../../helpers/mixins';
import { loggerMixin } from '../../mixins/loggerMixin';
import { observeAttributesMixin } from '../../mixins/observeAttributesMixin';
import { projectIdMixin } from '../../mixins/projectIdMixin';
import { Api, createSdk } from './api';

export const apiMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) => {
    const BaseClass = compose(
      projectIdMixin,
      observeAttributesMixin,
      loggerMixin
    )(superclass);

    return class InitLifecycleMixinClass extends BaseClass {
      #api: Api;

      #createSdk() {
        this.logger.debug('creating an sdk instance');
        this.#api = createSdk({ projectId: this.projectId, baseUrl: this.baseUrl }, this.mgmtKey, this.tenant);
      }

      get baseUrl() {
        return this.getAttribute('base-url');
      }

      get mgmtKey() {
        return this.getAttribute('mgmt-key');
      }

      //TODO: is this mandatory?
      get tenant() {
        return this.getAttribute('tenant');
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
            'mgmt-key',
            'tenant'
          ],
          () => {
            if (this.#api) {
              this.#createSdk();
            }
          });
      }
    };
  });
