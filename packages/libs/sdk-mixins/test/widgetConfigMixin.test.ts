import { widgetConfigMixin } from '../src';

const projectConfig = {
  widgets: {
    w1: { version: 2, targetLocales: ['es', 'fr'] },
    w2: { allowSubTenants: true },
  },
};

const createMixin = (widgetId: string | undefined) => {
  const MixinClass = widgetConfigMixin(
    class {
      getAttribute(attr: string) {
        return attr === 'widget-id' ? widgetId : undefined;
      }
    } as any,
  );
  const m = new MixinClass() as any;
  // configMixin reads config.json via fetchStaticResource and exposes it as `this.config`.
  m.fetchStaticResource = jest
    .fn()
    .mockResolvedValue({ body: projectConfig, headers: {} });
  return m;
};

describe('widgetConfigMixin', () => {
  describe('getWidgetConfig', () => {
    it('returns the per-widget entry from config.json', async () => {
      const m = createMixin('w1');
      await expect(m.getWidgetConfig()).resolves.toEqual({
        version: 2,
        targetLocales: ['es', 'fr'],
      });
    });

    it('returns undefined for an unknown widget id', async () => {
      const m = createMixin('nope');
      await expect(m.getWidgetConfig()).resolves.toBeUndefined();
    });
  });

  describe('isLocaleAvailable', () => {
    it('matches a target locale case-insensitively', async () => {
      const m = createMixin('w1');
      await expect(m.isLocaleAvailable('ES')).resolves.toBe(true);
    });

    it('is false for a locale not in targetLocales', async () => {
      const m = createMixin('w1');
      await expect(m.isLocaleAvailable('de')).resolves.toBe(false);
    });

    it('is false for an empty locale', async () => {
      const m = createMixin('w1');
      await expect(m.isLocaleAvailable('')).resolves.toBe(false);
    });

    it('is false when the widget has no targetLocales', async () => {
      const m = createMixin('w2');
      await expect(m.isLocaleAvailable('es')).resolves.toBe(false);
    });
  });

  describe('firstAvailableLocale', () => {
    it('returns the first candidate present in targetLocales (case-insensitive)', async () => {
      const m = createMixin('w1'); // targetLocales: ['es', 'fr']
      await expect(m.firstAvailableLocale(['EN', 'FR'])).resolves.toBe('FR');
    });

    it('falls back from a region locale to its language candidate', async () => {
      const m = createMixin('w1'); // targetLocales: ['es', 'fr']
      await expect(m.firstAvailableLocale(['es-es', 'es'])).resolves.toBe('es');
    });

    it('returns empty string when no candidate is available', async () => {
      const m = createMixin('w1');
      await expect(m.firstAvailableLocale(['de', 'it'])).resolves.toBe('');
    });

    it('returns empty string when the widget has no targetLocales', async () => {
      const m = createMixin('w2');
      await expect(m.firstAvailableLocale(['es', 'en'])).resolves.toBe('');
    });
  });
});
