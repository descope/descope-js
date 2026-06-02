export type Locale = {
  locale: string;
  fallback: string;
};

/**
 * Resolves the user-facing locale. Mirrors web-component's getUserLocale exactly so widget
 * locale resolution matches the flow runtime byte-for-byte.
 *
 * Order:
 *  1. Explicit locale argument (lowercased)
 *  2. navigator.language (lowercased), with the language part as fallback for 'xx-YY' forms
 *  3. Empty string
 */
export function getUserLocale(locale: string): Locale {
  if (locale) {
    return { locale: locale.toLowerCase(), fallback: locale.toLowerCase() };
  }
  const nl = navigator.language;
  if (!nl) {
    return { locale: '', fallback: '' };
  }

  if (nl.includes('-')) {
    return {
      locale: nl.toLowerCase(),
      fallback: nl.split('-')[0].toLowerCase(),
    };
  }

  return { locale: nl.toLowerCase(), fallback: nl.toLowerCase() };
}
