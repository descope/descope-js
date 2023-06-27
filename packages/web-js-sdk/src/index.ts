import sdk from './decoratedSdk';

// NOTE: when changing export in this file, make sure to update the same in
// index.umd.ts (for UMD bundles)
export {
  REFRESH_TOKEN_KEY,
  SESSION_TOKEN_KEY,
} from './enhancers/withPersistTokens/constants';

export default sdk;
