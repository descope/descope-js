import { pathJoin, compose, createSingletonMixin } from '@descope/sdk-helpers';
import { loggerMixin } from '../loggerMixin';
import {
  ASSETS_FOLDER,
  BASE_CONTENT_URL,
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
    // if there is a local storage override, use it
    // otherwise, if there is a base-static-url attribute, use it
    // otherwise, try to use base-url, and check if it's working
    // if it's working, use it
    // if not, use the default content url
    return class StaticResourcesMixinClass extends BaseClass {
      #lastBaseUrl?: string;
      #workingBaseUrl?: string;

      #getResourceUrls(filename: string): CustomUrl[] | CustomUrl {
        const overrideUrl = OVERRIDE_CONTENT_URL || this.baseStaticUrl;

        if (overrideUrl) {
          return getResourceUrl({
            projectId: this.projectId,
            filename,
            baseUrl: overrideUrl,
          });
        }

        const isBaseUrlUpdated = this.#lastBaseUrl !== this.baseUrl;
        const shouldFallbackFetch = isBaseUrlUpdated && !!this.baseUrl;

        // if the base url has changed, reset the working base url
        if (isBaseUrlUpdated) {
          this.#lastBaseUrl = this.baseUrl;
          this.#workingBaseUrl = undefined;
        }

        const resourceUrl = getResourceUrl({
          projectId: this.projectId,
          filename,
          baseUrl: this.#workingBaseUrl,
        });

        // if there is no reason to check the baseUrl, generate the resource url according to the priority
        if (!shouldFallbackFetch) {
          return resourceUrl;
        }

        const resourceUrlFromBaseUrl = getResourceUrl({
          projectId: this.projectId,
          filename,
          baseUrl: this.baseUrl + '/pages',
        });

        return [resourceUrlFromBaseUrl, resourceUrl];
      }

      async fetchStaticResource<F extends Format>(
        filename: string,
        format: F,
      ): Promise<{
        body: F extends 'json' ? Record<string, any> : string;
        headers: Record<string, string>;
      }> {
        const resourceUrls = this.#getResourceUrls(filename);

        // if there are multiple resource urls, it means that there are fallbacks,
        // if one of the options (which is not the last) is working, we want to keep using it by updating the workingBaseUrl
        const onSuccess = !Array.isArray(resourceUrls)
          ? null
          : (index: number) => {
              if (index !== resourceUrls.length - 1) {
                const { baseUrl } = resourceUrls[index];
                this.#workingBaseUrl = baseUrl;
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
        return this.getAttribute('base-static-url');
      }
    };
  },
);
