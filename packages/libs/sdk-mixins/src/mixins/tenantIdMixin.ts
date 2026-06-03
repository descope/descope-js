import { createSingletonMixin, compose } from '@descope/sdk-helpers';
import { createValidateAttributesMixin } from './createValidateAttributesMixin';

const tenantIdValidator = (_: string, value: string | null) =>
  value !== null &&
  !/^[a-zA-Z0-9_-]*$/.test(value) &&
  'tenant must contain only alphanumeric characters, hyphens, or underscores';

export const tenantIdMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) => {
    const BaseClass = compose(
      createValidateAttributesMixin({ tenant: tenantIdValidator }),
    )(superclass);

    return class TenantIdMixinClass extends BaseClass {
      get tenantId() {
        return this.getAttribute('tenant') || undefined;
      }
    };
  },
);
