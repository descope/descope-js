export type Locale = {
  locale: string;
  fallback: string;
};

/**
 * Resolves the user-facing locale, shared by the web-component flow runtime and the widget mixins
 * so both resolve locale identically.
 *
 * Order:
 *  1. Explicit locale argument (lowercased), used as its own fallback
 *  2. navigator.language (lowercased), with the language part as fallback for 'xx-YY' forms
 *  3. Empty strings
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
