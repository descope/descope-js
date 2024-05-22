import { pathJoin, compose, createSingletonMixin } from '@descope/sdk-helpers';
import { loggerMixin } from '../loggerMixin';
import {
  ASSETS_FOLDER,
  BASE_CONTENT_URL,
  OVERRIDE_CONTENT_URL,
} from './constants';
import { projectIdMixin } from '../projectIdMixin';
import { baseUrlMixin } from '../baseUrlMixin';

type Format = 'text' | 'json';

export function getResourceUrl({
  projectId,
  filename,
  assetsFolder = ASSETS_FOLDER,
  baseUrl,
}: {
  projectId: string;
  filename: string;
  assetsFolder?: string;
  baseUrl?: string;
}) {
  const url = new URL(OVERRIDE_CONTENT_URL || baseUrl || BASE_CONTENT_URL);
  url.pathname = pathJoin(url.pathname, projectId, assetsFolder, filename);

  return url.toString();
}

export const staticResourcesMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) => {
    const BaseClass = compose(
      loggerMixin,
      projectIdMixin,
      baseUrlMixin,
    )(superclass);

    return class StaticResourcesMixinClass extends BaseClass {
      async fetchStaticResource<F extends Format>(
        filename: string,
        format: F,
      ): Promise<{
        body: F extends 'json' ? Record<string, any> : string;
        headers: Record<string, string>;
      }> {
        const resourceUrl = getResourceUrl({
          projectId: this.projectId,
          filename,
          baseUrl: this.baseUrl,
        });
        const res = await fetch(resourceUrl, { cache: 'default' });
        if (!res.ok) {
          this.logger.error(
            `Error fetching URL ${resourceUrl} [${res.status}]`,
          );
        }

        return {
          body: await res[format](),
          headers: Object.fromEntries(res.headers.entries()),
        };
      }
    };
  },
);
