import { SdkFnWrapper, wrapWith } from '@descope/core-js-sdk';
import { CreateWebSdk } from '../../sdk';
import { AfterRequestHook } from '../../types';
import {
  addHooks,
  getAuthInfoFromResponse,
  isInvalidSessionResponse,
  removeInternalStorage,
  setInternalStorage,
} from '../helpers';
import { LOGGED_IN_INDICATOR_KEY } from './constants';

const logoutWrapper: SdkFnWrapper<{}> =
  (fn) =>
  async (...args) => {
    const resp = await fn(...args);
    removeInternalStorage(LOGGED_IN_INDICATOR_KEY);
    return resp;
  };

// The DSLI key is intentionally unprefixed — same convention as the lastUser
// localStorage key (`dls_last_user_login_id`) which is the bootstrap fallback
// used by `hasLoginIndicator`.
const withLoggedInIndicator =
  <T extends CreateWebSdk>(createSdk: T) =>
  (config: Parameters<T>[0]): ReturnType<T> => {
    const afterRequest: AfterRequestHook = async (req, res) => {
      if (isInvalidSessionResponse(req, res)) {
        removeInternalStorage(LOGGED_IN_INDICATOR_KEY);
        return;
      }
      const authInfo = await getAuthInfoFromResponse(res);
      // sessionExpiration is the reliable auth-success signal — JWTs may live in
      // HttpOnly cookies, but sessionExpiration is always in the response body.
      if (authInfo?.sessionExpiration) {
        setInternalStorage(
          LOGGED_IN_INDICATOR_KEY,
          String(authInfo.sessionExpiration),
        );
      }
    };

    const sdk = createSdk(addHooks(config, { afterRequest }));

    const wrappedSdk = wrapWith(
      sdk,
      ['logout', 'logoutAll', 'oidc.logout'],
      logoutWrapper,
    );

    return wrappedSdk as ReturnType<T>;
  };

export { withLoggedInIndicator };
export default withLoggedInIndicator;
