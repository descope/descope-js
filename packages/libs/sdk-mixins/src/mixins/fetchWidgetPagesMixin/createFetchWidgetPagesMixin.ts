import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import { localeMixin } from '../localeMixin';
import { staticResourcesMixin } from '../staticResourcesMixin';
import { widgetConfigMixin } from '../widgetConfigMixin';
import { widgetIdMixin } from '../widgetIdMixin';

/**
 * Builds a widget's fetchWidgetPagesMixin. Every widget shares identical logic and differs only by
 * its published base directory (the widget type/name under which its screens live in S3), so each
 * widget calls this with its own dir:
 *
 *   export const fetchWidgetPagesMixin = createFetchWidgetPagesMixin('user-profile-widget');
 *
 * `fetchWidgetPage` fetches `<base>/<widgetId>/<file>`, transparently preferring a localized
 * `<file>-<locale>.html` variant when the widget publishes that locale (config.json targetLocales),
 * and falling back to the default page otherwise.
 */
export const createFetchWidgetPagesMixin = (widgetPagesBaseDir: string) =>
  createSingletonMixin(<T extends CustomElementConstructor>(superclass: T) => {
    const BaseClass = compose(
      staticResourcesMixin,
      widgetIdMixin,
      widgetConfigMixin,
      localeMixin,
    )(superclass);
    return class FetchWidgetPagesMixinClass extends BaseClass {
      // Keep `init` typed as a method across the package boundary (mirrors widgetConfigMixin):
      // without it, the emitted .d.ts widens the inherited `init` to a property, and a widget
      // composing this alongside another init-providing mixin (e.g. initLifecycleMixin) hits TS2425.
      async init() {
        await super.init?.();
      }

      async fetchWidgetPage(filename: string) {
        const localized = await this.#tryFetchLocalized(filename);
        if (localized !== undefined) return localized;

        const res = await this.fetchStaticResource(
          `${widgetPagesBaseDir}/${this.widgetId}/${filename}`,
          'text',
        );
        return res?.body;
      }

      // Fetch <page>-<locale>.html when the widget publishes that locale (config.json
      // targetLocales); otherwise return undefined so the caller falls back to the default page.
      async #tryFetchLocalized(filename: string): Promise<string | undefined> {
        const userLocale = await this.firstAvailableLocale(
          this.localeCandidates,
        );
        if (!userLocale) return undefined;

        const ext = '.html';
        const base = filename.endsWith(ext)
          ? filename.slice(0, -ext.length)
          : filename;
        try {
          const res = await this.fetchStaticResource(
            `${widgetPagesBaseDir}/${this.widgetId}/${base}-${userLocale}${ext}`,
            'text',
          );
          return res?.body;
        } catch {
          return undefined;
        }
      }
    };
  });
