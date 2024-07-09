import { MAX_POLLING_TIMEOUT_MS, MIN_POLLING_INTERVAL_MS } from '../constants';

/** Polling configuration with defaults and normalizing checks */
export const normalizeWaitForSessionConfig = ({
  pollingIntervalMs = MIN_POLLING_INTERVAL_MS,
  timeoutMs = MAX_POLLING_TIMEOUT_MS,
} = {}) => ({
  pollingIntervalMs: Math.max(
    pollingIntervalMs || MIN_POLLING_INTERVAL_MS,
    MIN_POLLING_INTERVAL_MS,
  ),
  timeoutMs: Math.min(
    timeoutMs || MAX_POLLING_TIMEOUT_MS,
    MAX_POLLING_TIMEOUT_MS,
  ),
});
