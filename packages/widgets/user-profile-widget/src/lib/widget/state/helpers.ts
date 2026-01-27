import { decodeJWT } from '@descope/sdk-helpers';

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
