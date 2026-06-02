import { fetchWidgetPagesMixin } from '../src/lib/widget/mixins/fetchWidgetPagesMixin';

// configMixin reads config.json and exposes it as `this.config.projectConfig`.
const configBody = (targetLocales?: string[]) => ({
  body: { widgets: { w1: targetLocales ? { targetLocales } : {} } },
  headers: {},
});

const setNavigatorLanguage = (value: string) => {
  Object.defineProperty(navigator, 'language', { value, configurable: true });
};

type FetchOpts = {
  targetLocales?: string[];
  localized?: string; // suffix of the localized page that resolves, e.g. '-es.html'
  localizedThrows?: boolean;
};

const createMixin = (
  attrs: Record<string, string | undefined>,
  { targetLocales, localized, localizedThrows }: FetchOpts = {},
) => {
  const MixinClass = fetchWidgetPagesMixin(
    class {
      // eslint-disable-next-line class-methods-use-this
      getAttribute(attr: string) {
        return attrs[attr];
      }
    } as any,
  );
  const m = new MixinClass() as any;
  // Stub the network: config.json returns the widget config, *.html returns page text.
  const fetchSpy = jest.fn(async (filename: string) => {
    if (!filename.endsWith('.html')) return configBody(targetLocales);
    if (localized && filename.endsWith(localized)) {
      if (localizedThrows) throw new Error('not found');
      return { body: 'LOCALIZED' };
    }
    return { body: 'DEFAULT' };
  });
  m.fetchStaticResource = fetchSpy;
  return { m, fetchSpy };
};

describe('user-profile fetchWidgetPagesMixin (locale-aware fetching)', () => {
  it('fetches the locale-specific page when the locale is available', async () => {
    const { m, fetchSpy } = createMixin(
      { 'widget-id': 'w1', locale: 'es' },
      { targetLocales: ['es'], localized: '-es.html' },
    );

    await expect(m.fetchWidgetPage('page.html')).resolves.toBe('LOCALIZED');
    expect(fetchSpy).toHaveBeenCalledWith(
      'user-profile-widget/w1/page-es.html',
      'text',
    );
  });

  it('matches the target locale case-insensitively', async () => {
    const { m } = createMixin(
      { 'widget-id': 'w1', locale: 'es' },
      { targetLocales: ['ES'], localized: '-es.html' },
    );

    await expect(m.fetchWidgetPage('page.html')).resolves.toBe('LOCALIZED');
  });

  it('falls back to the default page when the locale is not in targetLocales', async () => {
    const { m, fetchSpy } = createMixin(
      { 'widget-id': 'w1', locale: 'es' },
      { targetLocales: [] }, // es unavailable
    );

    await expect(m.fetchWidgetPage('page.html')).resolves.toBe('DEFAULT');
    expect(fetchSpy).toHaveBeenCalledWith(
      'user-profile-widget/w1/page.html',
      'text',
    );
  });

  it('falls back to the default page when the localized fetch throws', async () => {
    const { m } = createMixin(
      { 'widget-id': 'w1', locale: 'es' },
      { targetLocales: ['es'], localized: '-es.html', localizedThrows: true },
    );

    await expect(m.fetchWidgetPage('page.html')).resolves.toBe('DEFAULT');
  });

  // Regression: navigator.language='en-US' against targetLocales=['en'] must use the language
  // fallback ('en') rather than serving the default page (see resolvedLocale fallback-drop bug).
  it('falls back to the language candidate of navigator.language (en-US -> en)', async () => {
    setNavigatorLanguage('en-US');
    const { m, fetchSpy } = createMixin(
      { 'widget-id': 'w1' }, // no explicit locale attribute
      { targetLocales: ['en'], localized: '-en.html' },
    );

    await expect(m.fetchWidgetPage('page.html')).resolves.toBe('LOCALIZED');
    expect(fetchSpy).toHaveBeenCalledWith(
      'user-profile-widget/w1/page-en.html',
      'text',
    );
  });
});
