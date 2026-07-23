import { pathJoin, compose, createSingletonMixin } from '@descope/sdk-helpers';
import { loggerMixin } from '../loggerMixin';
import {
  ASSETS_FOLDER,
  BASE_CONTENT_URL,
  BASE_CONTENT_URL_FALLBACK,
  OVERRIDE_CONTENT_URL,
} from './constants';
import { projectIdMixin } from '../projectIdMixin';
import { baseUrlMixin } from '../baseUrlMixin';
import { fetchWithFallbacks } from './fetchWithFallbacks';

type Format = 'text' | 'json';

type CustomUrl = URL & { baseUrl: string };

export function getResourceUrl({
  projectId,
  filename,
  assetsFolder = ASSETS_FOLDER,
  baseUrl = BASE_CONTENT_URL,
}: {
  projectId: string;
  filename: string;
  assetsFolder?: string;
  baseUrl?: string;
}) {
  const url: CustomUrl = new URL(baseUrl) as any;
  url.pathname = pathJoin(url.pathname, projectId, assetsFolder, filename);
  // we want to keep the baseUrl so we can use it later
  url.baseUrl = baseUrl;

  return url;
}

export const staticResourcesMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) => {
    const BaseClass = compose(
      loggerMixin,
      projectIdMixin,
      baseUrlMixin,
    )(superclass);

    // the logic should be as following:
    // 1. if there is a local storage override, use it
    // 2. otherwise, if there is a base-static-url attribute, use it
    // 3. otherwise, try to use base-url
    // 4. otherwise, try to use default content url (BASE_CONTENT_URL)
    // 5. otherwise, try to use the fallback content url (BASE_CONTENT_URL_FALLBACK)
    // For steps 3-5: if the url is valid, keep using it, and if not, don't try it anymore
    return class StaticResourcesMixinClass extends BaseClass {
      #lastBaseUrl?: string;
      #workingBaseUrl?: string;
      #failedUrls = new Set<string>();

      #getResourceUrls(filename: string): CustomUrl[] | CustomUrl {
        const overrideUrl = OVERRIDE_CONTENT_URL || this.baseStaticUrl;

        // Steps 1-2: Override URL or base-static-url takes precedence
        if (overrideUrl) {
          return this.#createResourceUrl(filename, overrideUrl);
        }

        // Reset state if base-url changed
        if (this.#lastBaseUrl !== this.baseUrl) {
          this.#lastBaseUrl = this.baseUrl;
          this.#workingBaseUrl = undefined;
          this.#failedUrls.clear();
        }

        // Build URL list based on cached state or fallback chain
        const urls: CustomUrl[] = [];

        if (this.#workingBaseUrl) {
          // Use cached working URL
          urls.push(this.#createResourceUrl(filename, this.#workingBaseUrl));
          // Add fallback only for BASE_CONTENT_URL (for resilience)
          if (this.#workingBaseUrl === BASE_CONTENT_URL) {
            urls.push(
              this.#createResourceUrl(filename, BASE_CONTENT_URL_FALLBACK),
            );
          }
        } else {
          // Build fallback chain: try URLs that haven't failed yet
          const baseUrlWithPages = this.baseUrl + '/pages';
          if (this.baseUrl && !this.#failedUrls.has(baseUrlWithPages)) {
            urls.push(this.#createResourceUrl(filename, baseUrlWithPages));
          }
          if (!this.#failedUrls.has(BASE_CONTENT_URL)) {
            urls.push(this.#createResourceUrl(filename, BASE_CONTENT_URL));
          }
          urls.push(
            this.#createResourceUrl(filename, BASE_CONTENT_URL_FALLBACK),
          );
        }

        return urls.length === 1 ? urls[0] : urls;
      }

      #createResourceUrl(filename: string, baseUrl: string): CustomUrl {
        return getResourceUrl({
          projectId: this.projectId,
          filename,
          baseUrl,
        });
      }

      async fetchStaticResource<F extends Format>(
        filename: string,
        format: F,
      ): Promise<{
        body: F extends 'json' ? Record<string, any> : string;
        headers: Record<string, string>;
      }> {
        const resourceUrls = this.#getResourceUrls(filename);

        // Cache the working URL and mark failed URLs
        const onSuccess = !Array.isArray(resourceUrls)
          ? null
          : (index: number) => {
              const { baseUrl } = resourceUrls[index];
              this.#workingBaseUrl = baseUrl;

              // Mark all URLs before this one as failed
              for (let i = 0; i < index; i++) {
                const failedUrl = resourceUrls[i].baseUrl;
                this.#failedUrls.add(failedUrl);
              }
            };

        try {
          const res = await fetchWithFallbacks(
            resourceUrls,
            { cache: 'default' },
            { logger: this.logger, onSuccess },
          );

          return {
            body: await res[format](),
            headers: Object.fromEntries(res.headers.entries()),
          };
        } catch (e) {
          this.logger.error(e.message);
        }
      }

      get baseStaticUrl() {
        return this.getAttribute('base-static-url') || '';
      }
    };
  },
);
