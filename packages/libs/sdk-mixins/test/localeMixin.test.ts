import { localeMixin } from '../src';

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

describe('localeMixin', () => {
  it('exposes the raw locale attribute', () => {
    expect(createLocaleMixin({ locale: 'en-US' }).locale).toBe('en-US');
  });

  it('returns an empty string when the locale attribute is unset', () => {
    expect(createLocaleMixin().locale).toBe('');
  });

  it('localeCandidates returns only the lowercased explicit locale (no language split for an explicit attr)', () => {
    expect(createLocaleMixin({ locale: 'en-US' }).localeCandidates).toEqual([
      'en-us',
    ]);
  });

  it('localeCandidates falls back to the language part for a region navigator.language', () => {
    setNavigatorLanguage('en-US');
    expect(createLocaleMixin().localeCandidates).toEqual(['en-us', 'en']);
  });

  it('localeCandidates is a single entry when navigator.language has no region', () => {
    setNavigatorLanguage('de');
    expect(createLocaleMixin().localeCandidates).toEqual(['de']);
  });

  it('localeCandidates is empty when there is no locale and no navigator.language', () => {
    setNavigatorLanguage('');
    expect(createLocaleMixin().localeCandidates).toEqual([]);
  });

  describe('firstAvailableLocale', () => {
    it('returns the matching candidate present in the available locales (case-insensitive)', () => {
      expect(
        createLocaleMixin({ locale: 'fr' }).firstAvailableLocale(['ES', 'FR']),
      ).toBe('fr');
    });

    it('falls back from a region locale to its language candidate', () => {
      setNavigatorLanguage('en-US'); // candidates: ['en-us', 'en']
      expect(createLocaleMixin().firstAvailableLocale(['en'])).toBe('en');
    });

    it('returns empty string when no candidate is available', () => {
      expect(
        createLocaleMixin({ locale: 'de' }).firstAvailableLocale(['es', 'fr']),
      ).toBe('');
    });

    it('returns empty string when there are no available locales', () => {
      expect(createLocaleMixin({ locale: 'es' }).firstAvailableLocale([])).toBe(
        '',
      );
    });
  });
});
