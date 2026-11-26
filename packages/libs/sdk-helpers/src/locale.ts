export type Locale = {
  locale: string;
  fallback: string;
};

export type ResolvedLocale = {
  locale: string;
  // whether `locale` is one of the available locales (e.g. a flow's targetLocales)
  available: boolean;
};

/**
 * Splits an explicit locale value into its lowercased entries, in preference order.
 * Accepts a single locale ('en-US') or a list separated by commas and/or whitespace
 * ('fr-CA,fr,en', or an OIDC ui_locales value 'fr-CA fr en'). Quality values copied from an
 * Accept-Language header ('fr;q=0.9') are ignored, so the order of the entries is what counts.
 */
export function parseLocales(locale: string): string[] {
  const entries = (locale || '')
    .split(/[\s,]+/)
    .map((entry) => entry.split(';')[0].trim().toLowerCase())
    .filter(Boolean);
  return [...new Set(entries)];
}

/**
 * Resolves the user-facing locale, shared by the web-component flow runtime and the widget mixins
 * so both resolve locale identically.
 *
 * Order:
 *  1. Explicit locale argument (lowercased), used as its own fallback. When it is a list, its
 *     first entry is used
 *  2. navigator.language (lowercased), with the language part as fallback for 'xx-YY' forms
 *  3. Empty strings
 */
export function getUserLocale(locale: string): Locale {
  const [explicit] = parseLocales(locale);
  if (explicit) {
    return { locale: explicit, fallback: explicit };
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

/**
 * Returns the lowercased locales to try, most preferred first:
 *  - every entry of an explicit locale value, as given (no language split, so list 'fr' after
 *    'fr-CA' to accept it)
 *  - otherwise navigator.language and its language-only fallback (e.g. 'en-us' then 'en')
 */
export function getUserLocaleCandidates(locale: string): string[] {
  const explicit = parseLocales(locale);
  if (explicit.length) {
    return explicit;
  }
  const { locale: nl, fallback } = getUserLocale('');
  return [...new Set([nl, fallback].filter(Boolean))];
}

/**
 * Picks the most preferred candidate that is in `availableLocales` (case-insensitive).
 * When none is available, returns the most preferred candidate with `available: false`, so callers
 * still report the user's locale (e.g. to the server) while rendering the default content.
 */
export function resolveUserLocale(
  locale: string,
  availableLocales: string[],
): ResolvedLocale {
  const available = (availableLocales ?? []).map((l) => l.toLowerCase());
  const candidates = getUserLocaleCandidates(locale);
  const match = candidates.find((c) => available.includes(c));
  if (match) {
    return { locale: match, available: true };
  }
  return { locale: candidates[0] ?? '', available: false };
}
