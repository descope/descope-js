import { compose } from '../../helpers/compose';
import { createSingletonMixin } from '../../helpers/mixins';
import { attributesMixin } from '../../mixins/attributesMixin';
import { Api, createSdk } from './api';

export const apiMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) => {
    const BaseClass = compose(
      attributesMixin
    )(superclass);

    return class InitLifecycleMixinClass extends BaseClass {
      #api: Api;

      get api() {
        if (!this.#api) {
          // TODO: should be updated once one of the init params changed
          this.#api = createSdk({ projectId: this.projectId, baseUrl: this.baseUrl }, this.mgmtKey);
        }

        return this.#api;
      }
    };
  });
