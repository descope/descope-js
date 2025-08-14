import createHttpClient from './httpClient';
import { Fetch, MultipleHooks } from './httpClient/types';
import createSdk from './sdk';
import { Logger } from './sdk/types';
import { stringNonEmpty, withValidations } from './sdk/validations';
import { hasPathValue } from './sdk/validations/validators';

type SdkConfig = {
  projectId: string;
  logger?: Logger;
  baseUrl?: string;
  hooks?: MultipleHooks;
  cookiePolicy?: RequestCredentials | null;
  baseHeaders?: HeadersInit;
  refreshCookieName?: string;
  fetch?: Fetch;
};

/** Validate we have non-empty project id */
const withSdkConfigValidations = withValidations([
  hasPathValue('projectId', stringNonEmpty('projectId')),
]);

/** Descope SDK client */
export default withSdkConfigValidations((config: SdkConfig) => {
  const {
    projectId,
    logger,
    baseUrl,
    cookiePolicy,
    baseHeaders = {},
    refreshCookieName,
    fetch,
  } = config;

  return createSdk(
    createHttpClient({
      baseUrl,
      projectId,
      logger,
      hooks: {
        get beforeRequest() {
          return config.hooks?.beforeRequest;
        },
        get afterRequest() {
          return config.hooks?.afterRequest;
        },
        get transformResponse() {
          return config.hooks?.transformResponse;
        },
      },
      cookiePolicy,
      baseConfig: { baseHeaders },
      refreshCookieName,
      fetch,
    }),
  );
});
