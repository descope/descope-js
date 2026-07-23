import { decodeJWT } from '@descope/sdk-helpers';
import { getSessionToken } from '@descope/web-js-sdk';

/**
 * Extracts the DCT (default current tenant) claim from a JWT token
 */
export const extractDctFromToken = (
  token: string | undefined | null,
): string | null => {
  if (!token) return null;
  const claims = decodeJWT(token);
  return claims?.dct || null;
};

/**
 * Gets the current tenant ID from the session token
 */
export const getCurrentTenantFromSession = (): string | null => {
  const sessionToken = getSessionToken();
  return extractDctFromToken(sessionToken);
};
