import { pathJoin } from '../../helpers/generic';
import { compose } from '../../helpers/compose';
import { createSingletonMixin } from '../../helpers/mixins';
import { attributesMixin } from '../attributesMixin';
import { loggerMixin } from '../loggerMixin';
import { ASSETS_FOLDER, BASE_CONTENT_URL } from './constants';

type Format = 'text' | 'json';

export function getResourceUrl(
  projectId: string,
  filename: string,
  assetsFolder = ASSETS_FOLDER,
) {
  const url = new URL(BASE_CONTENT_URL);
  url.pathname = pathJoin(url.pathname, projectId, assetsFolder, filename);

  return url.toString();
}

export const staticResourcesMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) => {
    const BaseClass = compose(loggerMixin, attributesMixin)(superclass);

    return class StaticResourcesMixinClass extends BaseClass {
      async fetchStaticResource<F extends Format>(
        filename: string,
        format: F,
      ): Promise<{
        body: F extends 'json' ? Record<string, any> : string;
        headers: Record<string, string>;
      }> {
        const resourceUrl = getResourceUrl(this.projectId, filename);
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
