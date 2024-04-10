/**
 * Get the JWT expiration WITHOUT VALIDATING the JWT
 * @param token The JWT to extract expiration from
 * @returns The Date for when the JWT expires or null if there is an issue
 */
export const getTokenExpiration = (token: string) => {
  const parts = token.split('.');
  try {
    if (parts.length === 3) {
      const claims = JSON.parse(window.atob(parts[1]));
      if (claims.exp) {
        return new Date(claims.exp * 1000);
      }
    }
  } catch (e) {}
  return null;
};
