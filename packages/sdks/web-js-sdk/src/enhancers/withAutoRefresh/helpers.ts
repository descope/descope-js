import { jwtDecode, JwtPayload } from 'jwt-decode';
import logger from '../helpers/logger';

/**
 * Get the JWT expiration WITHOUT VALIDATING the JWT
 * @param token The JWT to extract expiration from
 * @returns The Date for when the JWT expires or null if there is an issue
 */
export const getTokenExpiration = (
  token: string,
  sessionExpiration: number,
) => {
  if (sessionExpiration) {
    return new Date(sessionExpiration * 1000);
  }

  logger.debug(
    'Could not extract expiration time from session token, trying to decode the token',
  );
  try {
    const claims = jwtDecode<JwtPayload>(token);
    if (claims.exp) {
      return new Date(claims.exp * 1000);
    }
  } catch (e) {
    return null;
  }
};

export const millisecondsUntilDate = (date: Date) =>
  date ? date.getTime() - new Date().getTime() : 0;

export const createTimerFunctions = () => {
  const timerIds: NodeJS.Timeout[] = [];

  const clearAllTimers = () => {
    while (timerIds.length) {
      clearTimeout(timerIds.pop());
    }
  };

  const setTimer = (cb: () => void, timeout: number) => {
    timerIds.push(setTimeout(cb, timeout));
  };

  return { clearAllTimers, setTimer };
};
