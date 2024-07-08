import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import { debuggerMixin, themeMixin } from '@descope/sdk-mixins';
import { initFilterAuditInputMixin } from './initComponentsMixins/initFilterAuditInputMixin';
import { initAuditTableMixin } from './initComponentsMixins/initAuditTableMixin';

export const initMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    // @ts-ignore
    class InitMixinClass extends compose(
      debuggerMixin,
      themeMixin,
      initAuditTableMixin,
      initFilterAuditInputMixin,
    )(superclass) {
      async init() {
        await super.init?.();
      }
    },
);
