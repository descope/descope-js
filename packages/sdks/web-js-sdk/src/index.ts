import { compose } from './enhancers/helpers';
import { withAnalytics } from './enhancers/withAnalytics';
import { withAutoRefresh } from './enhancers/withAutoRefresh';
import { withCustomStorage } from './enhancers/withCustomStorage';
import { withFingerprint } from './enhancers/withFingerprint';
import { withFlowNonce } from './enhancers/withFlowNonce';
import { withLastLoggedInUser } from './enhancers/withLastLoggedInUser';
import { withNotifications } from './enhancers/withNotifications';
import withPersistTokens from './enhancers/withPersistTokens';
import createSdk from './sdk';

const decoratedCreateSdk = compose(
  withCustomStorage, // must be first
  withFingerprint,
  withAutoRefresh,
  withAnalytics,
  withNotifications,
  withFlowNonce,
  withLastLoggedInUser, // must be one before last due to TS types
  withPersistTokens, // must be last due to TS known limitation https://github.com/microsoft/TypeScript/issues/30727
)(createSdk);

export type { UserResponse, OidcConfig, CustomStorage } from './types';

// Note: make sure to update ./test/umd.test.ts when adding new constants
export {
  REFRESH_TOKEN_KEY,
  SESSION_TOKEN_KEY,
} from './enhancers/withPersistTokens/constants';

export {
  ensureFingerprintIds,
  clearFingerprintData,
} from './enhancers/withFingerprint/helpers';

export { hasOidcParamsInUrl } from './sdk/oidc/helpers';

export { isDescopeBridge } from './enhancers/helpers';

export type { JWTResponse } from '@descope/core-js-sdk';
export type { OneTapConfig } from './sdk/fedcm';
export type { CookieConfig } from './enhancers/withPersistTokens/types';
export type { FlowNonceOptions } from './enhancers/withFlowNonce/types';
export default decoratedCreateSdk;
export { decoratedCreateSdk as createSdk };
