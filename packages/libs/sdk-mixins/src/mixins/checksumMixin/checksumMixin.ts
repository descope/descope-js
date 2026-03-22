import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import { loggerMixin } from '../loggerMixin';
import { BASE_URLS } from '../injectNpmLibMixin/constants';

type ChecksumCache = {
  [libName: string]: {
    [version: string]: {
      [filePath: string]: string;
    };
  };
};

export const checksumMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) => {
    const BaseClass = compose(loggerMixin)(superclass);

    return class ChecksumMixinClass extends BaseClass {
      #checksumCache: ChecksumCache = {};

      get baseCdnUrl() {
        return this.getAttribute('base-cdn-url') || '';
      }

      /**
       * Load checksums.json for a given library and version
       * @param libName - npm package name (e.g., '@descope/flow-scripts')
       * @param version - package version or 'latest'
       * @returns Promise resolving to checksums object or null if not available
       */
      async loadChecksums(
        libName: string,
        version: string,
      ): Promise<Record<string, string> | null> {
        // Check cache first
        if (this.#checksumCache[libName]?.[version]) {
          this.logger.debug(
            `Using cached checksums for ${libName}@${version}`,
          );
          return this.#checksumCache[libName][version];
        }

        // Build URLs to try (base CDN + fallbacks)
        const cdnUrls = [this.baseCdnUrl, ...BASE_URLS].filter(Boolean);

        for (const baseUrl of cdnUrls) {
          try {
            const url = new URL(baseUrl);
            url.pathname = `/npm/${libName}@${version}/dist/checksums.json`;

            this.logger.debug(
              `Attempting to load checksums from ${url.toString()}`,
            );

            const response = await fetch(url.toString());

            if (!response.ok) {
              this.logger.debug(
                `Failed to load checksums from ${url.toString()}: ${response.status}`,
              );
              continue;
            }

            const checksums = await response.json();

            // Cache the checksums
            if (!this.#checksumCache[libName]) {
              this.#checksumCache[libName] = {};
            }
            this.#checksumCache[libName][version] = checksums;

            this.logger.debug(
              `Successfully loaded checksums for ${libName}@${version}`,
            );

            return checksums;
          } catch (error) {
            this.logger.debug(
              `Error loading checksums from ${baseUrl}: ${error.message}`,
            );
            // Try next URL
          }
        }

        this.logger.warn(
          `Could not load checksums for ${libName}@${version} from any CDN`,
        );
        return null;
      }

      /**
       * Get the integrity hash for a specific file within a library
       * @param libName - npm package name
       * @param version - package version
       * @param filePath - relative path to the file (e.g., 'dist/index.js')
       * @returns integrity hash string or undefined if not found
       */
      async getChecksum(
        libName: string,
        version: string,
        filePath: string,
      ): Promise<string | undefined> {
        const checksums = await this.loadChecksums(libName, version);

        if (!checksums) {
          return undefined;
        }

        // Normalize file path (remove leading slash if present)
        const normalizedPath = filePath.startsWith('/')
          ? filePath.slice(1)
          : filePath;

        return checksums[normalizedPath];
      }
    };
  },
);
