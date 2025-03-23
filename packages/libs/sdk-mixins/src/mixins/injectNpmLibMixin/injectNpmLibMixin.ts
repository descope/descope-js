import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import { configMixin } from '../configMixin';
import { loggerMixin } from '../loggerMixin';
import { BASE_URLS } from './constants';
import { generateLibUrls, injectScriptWithFallbacks } from './helpers';

// scripts load to window under descope object
declare global {
  var descope: any;
}

export const injectNpmLibMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) => {
    const BaseClass = compose(loggerMixin, configMixin)(superclass);

    return class InjectNpmLibMixinClass extends BaseClass {
      get baseCdnUrl() {
        return this.getAttribute('base-cdn-url');
      }

      injectNpmLib(
        libName: string,
        version: string,
        filePath = '',
        overrides: string[] = [],
      ) {
        this.logger.debug(
          `Injecting npm lib: "${libName}" with version: "${version}"`,
        );
        return injectScriptWithFallbacks(
          generateLibUrls(
            [...overrides, this.baseCdnUrl, ...BASE_URLS],
            libName,
            version,
            filePath,
          ),
          (scriptData, existingScript) => {
            if (existingScript) {
              this.logger.error(
                `Existing script cannot be loaded: "${scriptData.url}"`,
              );
              return;
            }
            this.logger.error(
              `Cannot load script from URL, Make sure this URL is valid and return the correct script: "${scriptData.url}"`,
            );
          },
        );
      }
    };
  },
);
