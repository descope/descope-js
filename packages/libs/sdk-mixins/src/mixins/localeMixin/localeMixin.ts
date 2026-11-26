import {
  createSingletonMixin,
  getUserLocaleCandidates,
  resolveUserLocale,
} from '@descope/sdk-helpers';

/**
 * Exposes the widget's locale to mixins that need it (HTML fetching, flow propagation).
 * Mirrors web-component's BaseDescopeWc locale handling:
 *  - `locale` getter returns the raw attribute value, defaulting to '' when unset (like themeMixin's
 *    theme/styleId), so callers can pass it straight to setAttribute without emitting "undefined".
 *  - `localeCandidates` returns the lowercased locales to try, most preferred first: every entry of
 *    the attribute (a single locale or a comma-separated list, e.g. 'fr-CA,fr,en'), or, when it is
 *    unset, navigator.language and its language-only fallback (e.g. 'en-us' then 'en'), matching
 *    the web-component's locale resolution (`resolveUserLocale`).
 *  - `firstAvailableLocale(availableLocales)` returns the most preferred candidate that the consumer
 *    actually publishes (e.g. a widget's config.json targetLocales), or '' when none match or the
 *    source language (default content) is preferred.
 */
export const localeMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class LocaleMixinClass extends superclass {
      get locale(): string {
        return this.getAttribute('locale') || '';
      }

      get localeCandidates(): string[] {
        return getUserLocaleCandidates(this.locale);
      }

      firstAvailableLocale(availableLocales: string[]): string {
        const { locale, available } = resolveUserLocale(
          this.locale,
          availableLocales,
        );
        return available ? locale : '';
      }
    },
);
