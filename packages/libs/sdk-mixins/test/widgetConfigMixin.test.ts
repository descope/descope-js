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
});
