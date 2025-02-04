import { jwtDecode, JwtPayload } from 'jwt-decode';
import logger from '../helpers/logger';
import { MAX_TIMEOUT } from '../../constants';

// The amount of time (ms) to trigger the refresh before session expires
const REFRESH_THRESHOLD = 20 * 1000; // 20 sec

/**
 * Get the JWT expiration WITHOUT VALIDATING the JWT
 * @param token The JWT to extract expiration from
 * @returns The Date for when the JWT expires or null if there is an issue
 */
export const getTokenExpiration = (token: string) => {
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

export const getAutoRefreshTimeout = (sessionExpiration: Date) => {
  let timeout = millisecondsUntilDate(sessionExpiration) - REFRESH_THRESHOLD;

  if (timeout > MAX_TIMEOUT) {
    logger.debug(
      `Timeout is too large (${timeout}ms), setting it to ${MAX_TIMEOUT}ms`,
    );
    timeout = MAX_TIMEOUT;
  }

  return timeout;
};
