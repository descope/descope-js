import { DEFAULT_BASE_API_URL } from './constants';
import createHttpClient from './httpClient';
import { AfterRequest, BeforeRequest, Fetch, Hooks } from './httpClient/types';
import createSdk from './sdk';
import { Logger } from './sdk/types';
import { stringNonEmpty, withValidations } from './sdk/validations';
import { hasPathValue } from './sdk/validations/validators';

type SdkConfig = {
  projectId: string;
  logger?: Logger;
  baseUrl?: string;
  hooks?: Hooks;
  cookiePolicy?: RequestCredentials | null;
  baseHeaders?: HeadersInit;
  refreshCookieName?: string;
  fetch?: Fetch;
};

/** Validate we have non-empty project id */
const withSdkConfigValidations = withValidations([
  hasPathValue('projectId', stringNonEmpty('projectId')),
]);

/** Add the ability to pass multiple hooks instead of one when creating an SDK instance */
const withMultipleHooks =
  <T extends object>(createSdk: (config: SdkConfig) => T) =>
  (
    config: Omit<SdkConfig, 'hooks'> & {
      hooks?: {
        beforeRequest?: BeforeRequest | BeforeRequest[];
        afterRequest?: AfterRequest | AfterRequest[];
        transformResponse?: Hooks['transformResponse'];
      };
    },
  ) => {
    const beforeRequest: BeforeRequest = (conf) => {
      // get the before hooks from the config while function is running
      // because the hooks might change after sdk creation
      const beforeRequestHooks = [].concat(config.hooks?.beforeRequest || []);
      return beforeRequestHooks?.reduce((acc, fn) => fn(acc), conf);
    };

    const afterRequest: AfterRequest = async (req, res) => {
      // get the after hooks from the config while function is running
      // because the hooks might change after sdk creation
      const afterRequestHooks = [].concat(config.hooks?.afterRequest || []);
      // do not remove this check - on old versions of react-native it is required
      if (afterRequestHooks.length == 0) return;
      const results = await Promise.allSettled(
        afterRequestHooks?.map((fn) => fn(req, res?.clone())),
      );
      // eslint-disable-next-line no-console
      results.forEach(
        (result) =>
          result.status === 'rejected' && config.logger?.error(result.reason),
      );
    };

    return createSdk({
      ...config,
      hooks: {
        beforeRequest,
        afterRequest,
        transformResponse: config.hooks?.transformResponse,
      },
    });
  };

/** Descope SDK client */
export default withSdkConfigValidations(
  withMultipleHooks(
    ({
      projectId,
      logger,
      baseUrl,
      hooks,
      cookiePolicy,
      baseHeaders = {},
      refreshCookieName,
      fetch,
    }: SdkConfig) =>
      createSdk(
        createHttpClient({
          baseUrl: baseUrl || DEFAULT_BASE_API_URL,
          projectId,
          logger,
          hooks,
          cookiePolicy,
          baseConfig: { baseHeaders },
          refreshCookieName,
          fetch,
        }),
      ),
  ),
);
