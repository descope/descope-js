import {
  getUserLocale,
  getUserLocaleCandidates,
  parseLocales,
  resolveUserLocale,
} from './locale';

const setNavigatorLanguage = (value: string) => {
  Object.defineProperty(navigator, 'language', {
    value,
    configurable: true,
  });
};

describe('getUserLocale', () => {
  it('lowercases an explicit locale (used as its own fallback)', () => {
    expect(getUserLocale('en-US')).toEqual({
      locale: 'en-us',
      fallback: 'en-us',
    });
  });

  it('falls back to navigator.language with the language part as fallback for xx-YY', () => {
    setNavigatorLanguage('fr-FR');
    expect(getUserLocale('')).toEqual({ locale: 'fr-fr', fallback: 'fr' });
  });

  it('uses navigator.language as-is when it has no region', () => {
    setNavigatorLanguage('de');
    expect(getUserLocale('')).toEqual({ locale: 'de', fallback: 'de' });
  });

  it('returns empty strings when there is no locale and no navigator.language', () => {
    setNavigatorLanguage('');
    expect(getUserLocale('')).toEqual({ locale: '', fallback: '' });
  });
});

describe('parseLocales', () => {
  it('returns a single lowercased locale', () => {
    expect(parseLocales('en-US')).toEqual(['en-us']);
  });

  it('splits a comma and/or whitespace separated list, keeping the order', () => {
    expect(parseLocales('fr-CA, fr ,en')).toEqual(['fr-ca', 'fr', 'en']);
    expect(parseLocales('fr-CA fr  en')).toEqual(['fr-ca', 'fr', 'en']);
  });

  it('drops empty entries, duplicates and quality values', () => {
    expect(parseLocales(',fr;q=0.9,, FR ,en;q=0.8,')).toEqual(['fr', 'en']);
  });

  it('returns an empty list for an empty or missing value', () => {
    expect(parseLocales('')).toEqual([]);
    expect(parseLocales(undefined)).toEqual([]);
  });
});

describe('getUserLocale with a locale list', () => {
  it('uses the first entry', () => {
    expect(getUserLocale('fr-CA,en')).toEqual({
      locale: 'fr-ca',
      fallback: 'fr-ca',
    });
  });
});

describe('getUserLocaleCandidates', () => {
  it('returns every explicit entry without splitting the language part', () => {
    expect(getUserLocaleCandidates('fr-CA,en')).toEqual(['fr-ca', 'en']);
  });

  it('falls back to navigator.language and its language part', () => {
    setNavigatorLanguage('en-US');
    expect(getUserLocaleCandidates('')).toEqual(['en-us', 'en']);
  });

  it('is empty when there is no locale and no navigator.language', () => {
    setNavigatorLanguage('');
    expect(getUserLocaleCandidates('')).toEqual([]);
  });
});

describe('resolveUserLocale', () => {
  it('picks the most preferred available entry (case-insensitive)', () => {
    expect(resolveUserLocale('fr-CA,fr,en', ['EN', 'Fr'])).toEqual({
      locale: 'fr',
      available: true,
    });
  });

  it('follows the preference order, not the available order', () => {
    expect(resolveUserLocale('en,fr', ['fr', 'en'])).toEqual({
      locale: 'en',
      available: true,
    });
  });

  it('does not split the language part of an explicit entry', () => {
    expect(resolveUserLocale('fr-CA,en', ['fr', 'en'])).toEqual({
      locale: 'en',
      available: true,
    });
  });

  it('matches the source language (en), which is not a target locale, as unavailable', () => {
    expect(resolveUserLocale('en,fr', ['fr'])).toEqual({
      locale: 'en',
      available: false,
    });
    expect(resolveUserLocale('de,en-US,fr', ['fr'])).toEqual({
      locale: 'en-us',
      available: false,
    });
  });

  it('matches the source language like any target locale when it has a translation', () => {
    expect(resolveUserLocale('en,fr', ['fr', 'en'])).toEqual({
      locale: 'en',
      available: true,
    });
    expect(resolveUserLocale('en-US,fr', ['fr', 'en'])).toEqual({
      locale: 'fr',
      available: true,
    });
  });

  it('returns the most preferred entry as unavailable when none is available', () => {
    expect(resolveUserLocale('pt-BR,it', ['de'])).toEqual({
      locale: 'pt-br',
      available: false,
    });
    expect(resolveUserLocale('pt-BR,it', undefined)).toEqual({
      locale: 'pt-br',
      available: false,
    });
  });

  it('matches navigator.language, then its language part', () => {
    setNavigatorLanguage('en-US');
    expect(resolveUserLocale('', ['en'])).toEqual({
      locale: 'en',
      available: true,
    });
    expect(resolveUserLocale('', ['de'])).toEqual({
      locale: 'en-us',
      available: false,
    });
  });

  it('returns an empty unavailable locale when there is nothing to resolve', () => {
    setNavigatorLanguage('');
    expect(resolveUserLocale('', ['en'])).toEqual({
      locale: '',
      available: false,
    });
  });
});
