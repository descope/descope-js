import createSdk from '@descope/web-js-sdk';
import { baseHeaders } from './constants';

export { createSdk };

export {
  getSessionToken,
  getRefreshToken,
  refresh,
  isSessionTokenExpired,
  isRefreshTokenExpired,
  getJwtRoles,
  getJwtPermissions,
  getCurrentTenant,
} from '@descope/web-js-sdk';

let globalSdk: ReturnType<typeof createSdk> | undefined;

export const getGlobalSdk = () => globalSdk;

export const setGlobalSdk = (sdk: ReturnType<typeof createSdk>) => {
  globalSdk = sdk;
};

export default (options: Parameters<typeof createSdk>[0]) => {
  return createSdk({
    ...options,
    baseHeaders: {
      ...baseHeaders,
      ...options.baseHeaders,
    },
  });
};
