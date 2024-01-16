import { compose } from '../../helpers/compose';
import { createSingletonMixin } from '../../helpers/mixins';
import { createValidateAttributesMixin } from '../../mixins/createValidateAttributesMixin';
import { missingAttrValidator } from '../../mixins/createValidateAttributesMixin/commonValidators';
import { loggerMixin } from '../../mixins/loggerMixin';
import { observeAttributesMixin } from '../../mixins/observeAttributesMixin';
import { projectIdMixin } from '../../mixins/projectIdMixin';
import { Sdk, createSdk } from '../api/sdk';

export const apiMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) => {
    const BaseClass = compose(
      projectIdMixin,
      observeAttributesMixin,
      loggerMixin,
      createValidateAttributesMixin({ 'tenant': missingAttrValidator }),
    )(superclass);

    return class InitLifecycleMixinClass extends BaseClass {
      #api: Sdk;

      #createSdk() {
        this.logger.debug('creating an sdk instance');
        this.#api = createSdk({ projectId: this.projectId, baseUrl: this.baseUrl }, this.tenant);
      }

      get baseUrl() {
        return this.getAttribute('base-url');
      }

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
