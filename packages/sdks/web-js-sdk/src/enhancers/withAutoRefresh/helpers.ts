import { jwtDecode, JwtPayload } from 'jwt-decode';
import logger from '../helpers/logger';
import { MAX_TIMEOUT, REFRESH_THRESHOLD } from '../../constants';

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

export const getAutoRefreshTimeout = (
  sessionExpiration: Date,
  nextRefreshSeconds?: number,
) => {
  let timeout: number;

  // If server provided nextRefreshSeconds, use it (converted to ms)
  // This helps balance refresh frequency for session inactivity tracking
  if (nextRefreshSeconds > 0) {
    timeout = nextRefreshSeconds * 1000;
    logger.debug(`Using provided nextRefreshSeconds: ${nextRefreshSeconds}s`);
  } else {
    // Refresh slightly before session expires
    timeout = millisecondsUntilDate(sessionExpiration) - REFRESH_THRESHOLD;
  }

  if (timeout > MAX_TIMEOUT) {
    logger.debug(
      `Timeout is too large (${timeout}ms), setting it to ${MAX_TIMEOUT}ms`,
    );
    timeout = MAX_TIMEOUT;
  }

  return timeout;
};
