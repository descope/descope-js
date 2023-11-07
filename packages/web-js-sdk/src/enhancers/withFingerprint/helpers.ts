import { load } from '@fingerprintjs/fingerprintjs-pro';
import {
  FP_EP_URL,
  FP_STORAGE_KEY,
  STORAGE_TTL_MS,
  VISITOR_REQUEST_ID_PARAM,
  VISITOR_SESSION_ID_PARAM,
} from './constants';
import { FingerprintObject } from './types';

const createFingerprintObject = (
  sessionId: string,
  requestId: string
): FingerprintObject => ({
  [VISITOR_SESSION_ID_PARAM]: sessionId,
  [VISITOR_REQUEST_ID_PARAM]: requestId,
});

/** Generate UUID based on current time and some randomness */
const generateUUID = () => {
  // return alphanumeric, sortable uuid of 27 characters
  return (
    Date.now().toString(36) +
    Math.random().toString(36).substring(2) + // removing '0.' prefix
    Math.random().toString(36).substring(2)
  ).substring(0, 27);
};

// Set FP data to storage with expiration
// We set the request id and session id together so they will have the same TTL
// This implementation is based on https://www.sohamkamani.com/javascript/localstorage-with-ttl-expiry/
const setFPToStorage = (value: FingerprintObject) => {
  const now = new Date();
  // `item` is an object which contains the value
  // as well as the time when it's supposed to expire
  const item = {
    value,
    expiry: now.getTime() + STORAGE_TTL_MS,
  };
  localStorage.setItem(FP_STORAGE_KEY, JSON.stringify(item));
};

// Get Fingerprint from storage, will return null if not exists, or if expired
const getFPFromStorage = (returnExpired = false): FingerprintObject => {
  const itemStr = localStorage.getItem(FP_STORAGE_KEY);
  // if the item doesn't exist, return null
  if (!itemStr) {
    return null;
  }
  const item = JSON.parse(itemStr);
  const now = new Date();
  // compare the expiry time of the item with the current time
  // return null if needed
  if (now.getTime() > item.expiry && !returnExpired) {
    return null;
  }
  return item.value;
};

/**
 * Ensure fingerprint ids (request id, session id) exist.
 * If not, It will generate and load them into to browser storage.
 * NOTE: Using fingerprintJS data has cost, use considerably.
 * @param fpKey FingerprintJS API key
 */
export const ensureFingerprintIds = async (fpKey: string) => {
  try {
    if (getFPFromStorage()) {
      // FP is already in storage, no need to
      return;
    }

    const sessionId = generateUUID();
    const agentP = load({ apiKey: fpKey, endpoint: FP_EP_URL });
    const agent = await agentP;
    const { requestId } = await agent.get({ linkedId: sessionId });
    const fpData = createFingerprintObject(sessionId, requestId);
    setFPToStorage(fpData);
  } catch (ex) {
    // istanbul ignore next
    if (global.FB_DEBUG) {
      // eslint-disable-next-line no-console
      console.error(ex);
    }
  }
};

/**
 * Get Fingerprint data (request ids) from storage, or create empty object
 * If data is expired, return it anyway
 */
export const getFingerprintData = (): FingerprintObject | null => {
  // get from storage if exists
  return getFPFromStorage(true);
};

/** Clear Fingerprint data from storage */
export const clearFingerprintData = () => {
  localStorage.removeItem(FP_STORAGE_KEY);
};
