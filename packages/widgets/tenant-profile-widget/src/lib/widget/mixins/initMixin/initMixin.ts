import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import { debuggerMixin, themeMixin } from '@descope/sdk-mixins';
import { flowRedirectUrlMixin } from '../flowRedirectUrlMixin';
import { initTenantAdminLinkSSOMixin } from './initComponentsMixins/initTenantAdminLinkSSOMixin';
import { initTenantCustomAttributesMixin } from './initComponentsMixins/initTenantCustomAttributesMixin';
import { initTenantEmailDomainsMixin } from './initComponentsMixins/initTenantEmailDomainsMixin';
import { initTenantSSOExclusionsMixin } from './initComponentsMixins/initTenantSSOExclusionsMixin';
import { initTenantEnforceSSOMixin } from './initComponentsMixins/initTenantEnforceSSOMixin';
import { initTenantNameMixin } from './initComponentsMixins/initTenantNameMixin';
import { initWidgetRootMixin } from './initComponentsMixins/initWidgetRootMixin';
import { initTenantPasswordPolicyUserAuthMethodMixin } from './initComponentsMixins/initTenantPasswordPolicyUserAuthMethodMixin';
import { initTenantSessionSettingsUserAuthMethodMixin } from './initComponentsMixins/initTenantSessionSettingsUserAuthMethodMixin';

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
      initTenantSSOExclusionsMixin,
      initTenantEnforceSSOMixin,
      initTenantCustomAttributesMixin,
      initTenantAdminLinkSSOMixin,
      initTenantPasswordPolicyUserAuthMethodMixin,
      initTenantSessionSettingsUserAuthMethodMixin,
    )(superclass) {
      async init() {
        await super.init?.();
      }
    },
);
