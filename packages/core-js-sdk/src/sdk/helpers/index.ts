import jwtDecode, { JwtPayload } from 'jwt-decode';
import { ResponseData, SdkResponse } from '../types';
import HttpStatusCodes from '../../constants/httpStatusCodes';

function getJwtAuthorizationItems(
  token: string,
  tenant: string,
  claim: string
): string[] {
  let claims: any = parseJwt(token);
  if (tenant) {
    claims = claims?.tenants?.[tenant];
  }
  const items = claims?.[claim];
  return Array.isArray(items) ? items : [];
}

function parseJwt(token: string): JwtPayload {
  if (typeof token !== 'string' || !token)
    throw new Error('Invalid token provided');
  return jwtDecode(token);
}

/**
 * Checks if the given JWT is still valid but DOES NOT check for signature
 *
 * @param token JWT token
 */
export function isJwtExpired(token: string): boolean {
  const { exp } = parseJwt(token);
  const currentTime = new Date().getTime() / 1000;
  return currentTime > exp;
}

/**
 * Returns the list of permissions granted in the given JWT but DOES NOT check for signature
 *
 * @param token JWT token
 */
export function getJwtPermissions(token: string, tenant?: string): string[] {
  return getJwtAuthorizationItems(token, tenant, 'permissions');
}

/**
 * Returns the list of roles specified in the given JWT but DOES NOT check for signature
 *
 * @param token JWT token
 */
export function getJwtRoles(token: string, tenant?: string): string[] {
  return getJwtAuthorizationItems(token, tenant, 'roles');
}

/** Joins path parts making sure there is only one path separator between parts */
export const pathJoin = (...args: string[]) =>
  args.join('/').replace(/\/{2,}/g, '/');

/** Transform the Promise Response to our internal SdkResponse implementation
 * @param response The Response promise from fetch
 * @param transform Optionally transform the response JSON to another type
 */
export async function transformResponse<
  T extends ResponseData,
  S extends ResponseData = T
>(
  response: Promise<Response>,
  transform?: (data: T) => S
): Promise<SdkResponse<S>> {
  const resp = await response;

  const ret: SdkResponse<S> = {
    code: resp.status,
    ok: resp.ok,
    response: resp,
  };

  const data = await resp.clone().json();

  if (!resp.ok) {
    ret.error = data;

    if (resp.status === HttpStatusCodes.TOO_MANY_REQUESTS) {
      Object.assign(ret.error, {
        retryAfter: Number.parseInt(resp.headers?.get('retry-after')) || 0,
      });
    }
  } else if (transform) {
    ret.data = transform(data);
  } else {
    ret.data = <S>data;
  }

  return ret;
}
