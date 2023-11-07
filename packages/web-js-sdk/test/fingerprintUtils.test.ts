import { load } from '@fingerprintjs/fingerprintjs-pro';
import { mockFingerprint } from './mocks';
import {
  FP_STORAGE_KEY,
  VISITOR_REQUEST_ID_PARAM,
  VISITOR_SESSION_ID_PARAM,
} from '../src/enhancers/withFingerprint/constants';
import {
  ensureFingerprintIds,
  getFingerprintData,
} from '../src/enhancers/withFingerprint/helpers';

jest.mock('@fingerprintjs/fingerprintjs-pro', () => ({
  load: jest.fn().mockReturnValue({
    get: jest.fn().mockImplementation(async (data) => {
      return { ...data, requestId: 'remote-request-id' };
    }),
  }),
}));

describe('fingerprintUtils', () => {
  afterEach(() => {
    window.location.search = '';
  });

  it('should not trigger FP load if it is already exist and not expired', async () => {
    // set local storage FP to one second from now
    localStorage.setItem(
      FP_STORAGE_KEY,
      JSON.stringify({
        value: mockFingerprint,
        expiry: new Date().getTime() + 1000,
      })
    );

    await ensureFingerprintIds('123');

    expect(load).not.toBeCalled();

    // ensure FP data
    const requestId = getFingerprintData()[VISITOR_REQUEST_ID_PARAM];
    expect(requestId).toEqual('local-request-id');
    const sessionId = getFingerprintData()[VISITOR_SESSION_ID_PARAM];
    expect(sessionId).toEqual('local-session-id');
  });

  it('should trigger FP if it is already exist but expired', async () => {
    localStorage.setItem(
      FP_STORAGE_KEY,
      JSON.stringify({
        value: mockFingerprint,
        expiry: new Date().getTime() - 1000,
      })
    );

    await ensureFingerprintIds('123');

    expect(load).toBeCalled();
    // ensure FP data
    const requestId = getFingerprintData()[VISITOR_REQUEST_ID_PARAM];
    expect(requestId).toEqual('remote-request-id');
    const sessionId = getFingerprintData()[VISITOR_SESSION_ID_PARAM];
    expect(sessionId).toBeTruthy();
  });

  it('should trigger FP if it does not exist', async () => {
    localStorage.removeItem(FP_STORAGE_KEY);

    await ensureFingerprintIds('123');

    expect(load).toBeCalled();
    // ensure FP data
    const requestId = getFingerprintData()[VISITOR_REQUEST_ID_PARAM];
    expect(requestId).toEqual('remote-request-id');
    const sessionId = getFingerprintData()[VISITOR_SESSION_ID_PARAM];
    expect(sessionId).toBeTruthy();
  });

  it('should return fingerprint even if expired', async () => {
    localStorage.setItem(
      FP_STORAGE_KEY,
      JSON.stringify({
        value: mockFingerprint,
        expiry: new Date().getTime() - 1000,
      })
    );

    const requestId = getFingerprintData()[VISITOR_REQUEST_ID_PARAM];
    expect(requestId).toEqual('local-request-id');
    const sessionId = getFingerprintData()[VISITOR_SESSION_ID_PARAM];
    expect(sessionId).toEqual('local-session-id');
  });

  it('no fingerprint data ', async () => {
    localStorage.removeItem(FP_STORAGE_KEY);
    expect(getFingerprintData()).toBeNull();
  });
});
