import { createSingletonMixin } from '@descope/sdk-helpers';
import { getUserLocale } from './helpers';

/**
 * Exposes the widget's locale to mixins that need it (HTML fetching, flow propagation).
 * Mirrors web-component's BaseDescopeWc locale handling:
 *  - `locale` getter returns the raw attribute value (undefined if unset/empty)
 *  - `resolvedLocale` returns the lowercased final locale, falling back to navigator.language
 */
export const localeMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class LocaleMixinClass extends superclass {
      get locale(): string | undefined {
        return this.getAttribute('locale') || undefined;
      }

      get resolvedLocale(): string {
        return getUserLocale(this.locale || '').locale;
      }
    },
);
