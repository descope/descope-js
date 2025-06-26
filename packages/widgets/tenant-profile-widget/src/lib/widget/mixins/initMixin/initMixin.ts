import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import { debuggerMixin, themeMixin } from '@descope/sdk-mixins';
import { flowRedirectUrlMixin } from '../flowRedirectUrlMixin';
import { initTenantCustomAttributesMixin } from './initComponentsMixins/initTenantCustomAttributesMixin';
import { initTenantEmailDomainsMixin } from './initComponentsMixins/initTenantEmailDomainsMixin';
import { initTenantEnforceSSOMixin } from './initComponentsMixins/initTenantEnforceSSOMixin';
import { initTenantNameMixin } from './initComponentsMixins/initTenantNameMixin';
import { initWidgetRootMixin } from './initComponentsMixins/initWidgetRootMixin';

export const initMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    /* @ts-ignore */
    class InitMixinClass extends compose(
      debuggerMixin,
      themeMixin,
      flowRedirectUrlMixin, // This mixin must be before all other mixins that loads flows,
      initWidgetRootMixin,
      initTenantNameMixin,
      initTenantEmailDomainsMixin,
      initTenantEnforceSSOMixin,
      initTenantCustomAttributesMixin,
    )(superclass) {
      async init() {
        await super.init?.();
      }
    },
);
