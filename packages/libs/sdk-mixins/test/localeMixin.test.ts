import { getUserLocale, localeMixin } from '../src';

const createLocaleMixin = (attrs: Record<string, string | undefined> = {}) => {
  const MixinClass = localeMixin(
    class {
      getAttribute(attr: string) {
        return attrs[attr];
      }
    } as any,
  );
  return new MixinClass() as any;
};

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

describe('localeMixin', () => {
  it('exposes the raw locale attribute', () => {
    expect(createLocaleMixin({ locale: 'en-US' }).locale).toBe('en-US');
  });

  it('returns undefined when the locale attribute is unset', () => {
    expect(createLocaleMixin().locale).toBeUndefined();
  });

  it('resolvedLocale lowercases the attribute locale', () => {
    expect(createLocaleMixin({ locale: 'en-US' }).resolvedLocale).toBe('en-us');
  });

  it('resolvedLocale falls back to navigator.language when no attribute is set', () => {
    setNavigatorLanguage('es-ES');
    expect(createLocaleMixin().resolvedLocale).toBe('es-es');
  });
});
