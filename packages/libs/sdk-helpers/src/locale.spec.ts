import { getUserLocale } from './locale';

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
