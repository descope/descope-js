import { compose, createSingletonMixin, pathJoin } from '@descope/sdk-helpers';
import { baseUrlMixin } from '../baseUrlMixin';
import { loggerMixin } from '../loggerMixin';
import { projectIdMixin } from '../projectIdMixin';
import {
  ASSETS_FOLDER,
  BASE_CONTENT_URL,
  OVERRIDE_CONTENT_URL,
} from './constants';

type Format = 'text' | 'json';

export const staticResourcesMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) => {
    const BaseClass = compose(
      loggerMixin,
      projectIdMixin,
      baseUrlMixin,
    )(superclass);

    return class StaticResourcesMixinClass extends BaseClass {
      preferredBaseURL?: string;

      async fetchStaticResource<F extends Format>(
        filename: string,
        format: F,
        assetsFolder = ASSETS_FOLDER,
      ): Promise<{
        body: F extends 'json' ? Record<string, any> : string;
        headers: Record<string, string>;
      }> {
        const fetchResourceFromBaseURL = async (baseUrl: string) => {
          // Compute the base URL to fetch the resource from
          // This allows overriding the base URL for static resources
          const computedBaseUrl = new URL(
            OVERRIDE_CONTENT_URL ||
              this.preferredBaseURL ||
              baseUrl ||
              BASE_CONTENT_URL,
          );

          const resourceUrl = new URL(
            pathJoin(
              computedBaseUrl.pathname,
              this.projectId,
              assetsFolder,
              filename,
            ),
            computedBaseUrl,
          );

          const res = await fetch(resourceUrl, { cache: 'default' });
          if (!res.ok) {
            this.logger.error(
              `Error fetching URL ${resourceUrl} [${res.status}]`,
            );
          } else {
            if (!this.preferredBaseURL) {
              this.logger.debug(`Fetched URL ${resourceUrl} [${res.status}]`);
              this.logger.debug(
                `Updating preferred base URL to ${computedBaseUrl.toString()}`,
              );
              this.preferredBaseURL = computedBaseUrl.toString();
            }
          }
          return res;
        };

        try {
          // We prefer to fetch the resource from the base API URL
          let res = await fetchResourceFromBaseURL(
            new URL('/pages', this.baseUrl).toString(),
          );
          if (!res.ok) {
            // If the resource is not found in the base API URL, we try to fetch it from the static URL
            res = await fetchResourceFromBaseURL(this.baseStaticUrl);
          }
          return {
            body: await res[format](),
            headers: Object.fromEntries(res.headers.entries()),
          };
        } catch (e) {
          this.logger.error(
            `Error fetching static resource ${filename} from ${this.baseStaticUrl}`,
          );
          const res = await fetchResourceFromBaseURL(this.baseStaticUrl);
          return {
            body: await res[format](),
            headers: Object.fromEntries(res.headers.entries()),
          };
        }
      }

      get baseStaticUrl() {
        return this.getAttribute('base-static-url');
      }
    };
  },
);
