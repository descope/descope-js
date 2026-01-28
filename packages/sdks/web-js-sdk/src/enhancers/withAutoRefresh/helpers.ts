import { jwtDecode, JwtPayload } from 'jwt-decode';
import logger from '../helpers/logger';
import { MAX_TIMEOUT, REFRESH_THRESHOLD, IS_BROWSER } from '../../constants';
import { getLocalStorage } from '../helpers';

// localStorage key for opt-in activity-based refresh
export const ACTIVITY_REFRESH_KEY = '__descope_activity_refresh';
const ACTIVITY_DEBOUNCE_MS = 1000;

const ACTIVITY_EVENTS = [
  'mousemove',
  'keydown',
  'touchstart',
  'scroll',
  'click',
  'pointerdown',
] as const;

// Check if localStorage opt-in flag is set
export const isActivityRefreshEnabled = (): boolean => {
  if (!IS_BROWSER) return false;
  try {
    return getLocalStorage(ACTIVITY_REFRESH_KEY) === 'true';
  } catch {
    return false;
  }
};

// Factory to create activity tracking functions
export const createActivityTracker = (loggerInstance: {
  debug: (msg: string) => void;
}) => {
  let hadActivitySinceLastRefresh = true; // Start as true (assume active on init)
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let listenersAttached = false;

  const onActivity = () => {
    if (debounceTimer) return; // Debounce rapid events
    debounceTimer = setTimeout(() => {
      if (!hadActivitySinceLastRefresh) {
        loggerInstance.debug('User activity detected, marking as active');
      }
      hadActivitySinceLastRefresh = true;
      debounceTimer = null;
    }, ACTIVITY_DEBOUNCE_MS);
  };

  const attachListeners = () => {
    if (!IS_BROWSER || listenersAttached) return;
    ACTIVITY_EVENTS.forEach((event) => {
      document.addEventListener(event, onActivity, {
        passive: true,
        capture: true,
      });
    });
    listenersAttached = true;
  };

  const detachListeners = () => {
    if (!IS_BROWSER || !listenersAttached) return;
    ACTIVITY_EVENTS.forEach((event) => {
      document.removeEventListener(event, onActivity, { capture: true });
    });
    if (debounceTimer) clearTimeout(debounceTimer);
    listenersAttached = false;
  };

  return {
    attachListeners,
    detachListeners,
    hadActivity: () => hadActivitySinceLastRefresh,
    resetActivity: () => {
      hadActivitySinceLastRefresh = false;
    },
    markActive: () => {
      if (!hadActivitySinceLastRefresh) {
        loggerInstance.debug('Marking user as active (visibility change)');
      }
      hadActivitySinceLastRefresh = true;
    },
  };
};

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
