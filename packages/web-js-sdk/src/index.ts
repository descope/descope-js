import { compose } from './enhancers/helpers';
import { withAnalytics } from './enhancers/withAnalytics';
import { withAutoRefresh } from './enhancers/withAutoRefresh';
import { withFingerprint } from './enhancers/withFingerprint';
import { withLastLoggedInUser } from './enhancers/withLastLoggedInUser';
import { withNotifications } from './enhancers/withNotifications';
import withPersistTokens from './enhancers/withPersistTokens';
import createSdk from './sdk';

const decoratedCreateSdk = compose(
  withFingerprint,
  withAutoRefresh,
  withAnalytics,
  withNotifications,
  withLastLoggedInUser, // must be one before last due to TS types
  withPersistTokens // must be last due to TS known limitation https://github.com/microsoft/TypeScript/issues/30727
)(createSdk);

export type { UserResponse } from './types';

// Note: make sure to update packages/web-js-sdk/test/umd.test.ts when adding new constants
export {
  REFRESH_TOKEN_KEY,
  SESSION_TOKEN_KEY,
} from './enhancers/withPersistTokens/constants';

export {
  ensureFingerprintIds,
  clearFingerprintData,
} from './enhancers/withFingerprint/helpers';

export default decoratedCreateSdk;
