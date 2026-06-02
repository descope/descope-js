import { createSingletonMixin } from '@descope/sdk-helpers';
import { getUserLocale } from './helpers';

/**
 * Exposes the widget's locale to mixins that need it (HTML fetching, flow propagation).
 * Mirrors web-component's BaseDescopeWc locale handling:
 *  - `locale` getter returns the raw attribute value (undefined if unset/empty)
 *  - `localeCandidates` returns the lowercased locales to try, most-specific first: the resolved
 *    locale and then its language-only fallback (e.g. 'en-us' then 'en'), matching the
 *    web-component's getHtmlFilenameWithLocale probe order. Falls back to navigator.language.
 */
export const localeMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class LocaleMixinClass extends superclass {
      get locale(): string | undefined {
        return this.getAttribute('locale') || undefined;
      }

      get localeCandidates(): string[] {
        const { locale, fallback } = getUserLocale(this.locale || '');
        return [...new Set([locale, fallback].filter(Boolean))];
      }
    },
);
