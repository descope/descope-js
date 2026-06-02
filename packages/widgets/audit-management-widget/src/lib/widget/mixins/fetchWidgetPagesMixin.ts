import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import {
  localeMixin,
  staticResourcesMixin,
  widgetConfigMixin,
  widgetIdMixin,
} from '@descope/sdk-mixins';

const WIDGET_PAGES_BASE_DIR = 'audit-management-widget';

export const fetchWidgetPagesMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) => {
    const BaseClass = compose(
      staticResourcesMixin,
      widgetIdMixin,
      widgetConfigMixin,
      localeMixin,
    )(superclass);
    return class FetchWidgetPagesMixinClass extends BaseClass {
      async fetchWidgetPage(filename: string) {
        const localized = await this.#tryFetchLocalized(filename);
        if (localized !== undefined) return localized;

        const res = await this.fetchStaticResource(
          `${WIDGET_PAGES_BASE_DIR}/${this.widgetId}/${filename}`,
          'text',
        );
        return res?.body;
      }

      // Fetch <page>-<locale>.html when the widget publishes that locale (config.json
      // targetLocales); otherwise return undefined so the caller falls back to the default page.
      async #tryFetchLocalized(filename: string): Promise<string | undefined> {
        const userLocale = this.resolvedLocale;
        if (!userLocale) return undefined;
        if (!(await this.isLocaleAvailable(userLocale))) return undefined;

        const ext = '.html';
        const base = filename.endsWith(ext)
          ? filename.slice(0, -ext.length)
          : filename;
        try {
          const res = await this.fetchStaticResource(
            `${WIDGET_PAGES_BASE_DIR}/${this.widgetId}/${base}-${userLocale}${ext}`,
            'text',
          );
          return res?.body;
        } catch {
          return undefined;
        }
      }
    };
  },
);
