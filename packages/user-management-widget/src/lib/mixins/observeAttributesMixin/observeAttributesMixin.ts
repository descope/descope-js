import { compose } from '../../helpers/compose';
import { createSingletonMixin } from '../../helpers/mixins';
import { initLifecycleMixin } from '../initLifecycleMixin';
import { loggerMixin } from '../loggerMixin';
import { observeAttributes } from './helpers';

type OnAttrChange = (
  attrName: string,
  value: string | null,
) => void;

export const observeAttributesMixin = createSingletonMixin(<T extends CustomElementConstructor>(superclass: T) => {
  const BaseClass = compose(loggerMixin, initLifecycleMixin)(superclass);
  return class ObserveAttributesMixinClass extends BaseClass {
    #observeMappings = {};

    async init() {
      await super.init?.();
      
      observeAttributes(this, (attrName: string) => {
        this.#observeMappings[attrName]?.forEach((cb: OnAttrChange) => {
          cb(attrName, this.getAttribute(attrName));
        });
      });
    }

    observeAttribute(attrName: string, onAttrChange: OnAttrChange) {
      if (!this.#observeMappings[attrName]) {
        this.#observeMappings[attrName] = [];
      }

      const idx = this.#observeMappings[attrName].push(onAttrChange);

      return () => this.#observeMappings[attrName].splice(idx, 1);
    }

    observeAttributes(attrs: string[], cb: OnAttrChange) {
      const unobserveList = attrs.reduce((acc, attrName) => {
        acc.push(this.observeAttribute(attrName, cb));

        return acc;
      }, []);

      return () => unobserveList.forEach(unobserve => unobserve());
    }
  };
});
