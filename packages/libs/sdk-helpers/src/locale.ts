// The language flows and widgets are written in. It is not part of their targetLocales, since its
// content is the default (not translated) content. Update it if a different source language is
// ever supported.
const SOURCE_LANGUAGE = 'en';

export type Locale = {
  locale: string;
  fallback: string;
};

export type ResolvedLocale = {
  locale: string;
  // the user's locale that `locale` was picked for (e.g. 'fr-ca' when `locale` is 'fr'), to report
  requestedLocale: string;
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
 *  - every entry of an explicit locale value, as given (`resolveUserLocale` tries the language
 *    part of each entry of a list)
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
 * Picks the most preferred candidate that matches `availableLocales` (case-insensitive). Each
 * candidate is tried in order, and matches when:
 *  - it is in `availableLocales`
 *  - only for a list of locales: its language part is (e.g. 'fr-ca' matches 'fr'). `locale` is then
 *    the available locale, and `requestedLocale` keeps the candidate
 *  - the source language has no translation in `availableLocales`, and the candidate is in it
 *    (e.g. 'en', 'en-us'). Its content is the default content, so it is returned with
 *    `available: false`
 * When none matches, returns the most preferred candidate with `available: false`, so callers
 * still report the user's locale (e.g. to the server) while rendering the default content.
 */
export function resolveUserLocale(
  locale: string,
  availableLocales: string[],
): ResolvedLocale {
  const available = (availableLocales ?? []).map((l) => l.toLowerCase());
  const candidates = getUserLocaleCandidates(locale);
  // a single explicit locale is not split to its language part, to keep how it worked before lists
  // were supported (e.g. 'fr-CA' alone does not match 'fr')
  const isList = parseLocales(locale).length > 1;
  const getLanguage = (l: string) => l.split('-')[0];
  // when the source language also has a translation, match it like any other target locale
  const matchSourceLanguage = !available.some(
    (l) => getLanguage(l) === SOURCE_LANGUAGE,
  );

  // the locale that a candidate matches, if any
  const matchCandidate = (c: string): string | undefined => {
    const language = getLanguage(c);
    if (available.includes(c)) return c;
    if (isList && available.includes(language)) return language;
    if (matchSourceLanguage && language === SOURCE_LANGUAGE) return c;
    return undefined;
  };

  const requestedLocale =
    candidates.find((c) => matchCandidate(c)) ?? candidates[0] ?? '';
  const matched = matchCandidate(requestedLocale) ?? requestedLocale;
  return {
    locale: matched,
    requestedLocale,
    available: available.includes(matched),
  };
}
