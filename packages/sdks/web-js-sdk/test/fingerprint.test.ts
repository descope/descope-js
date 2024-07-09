import {
  FP_BODY_DATA,
  FP_STORAGE_KEY,
  VISITOR_REQUEST_ID_PARAM,
  VISITOR_SESSION_ID_PARAM,
} from '../src/enhancers/withFingerprint/constants';
import createSdk from '../src/index';

const descopeHeaders = {
  'x-descope-sdk-name': 'web-js',
  'x-descope-sdk-version': global.BUILD_VERSION,
};

const mockFetch = jest.fn().mockReturnValueOnce(new Promise(() => {}));
global.fetch = mockFetch;

describe('fingerprint', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  it('beforeRequest - should add visitor request and session id to outgoing requests', () => {
    const fpData = {
      [VISITOR_REQUEST_ID_PARAM]: 'request',
      [VISITOR_SESSION_ID_PARAM]: 'session',
    };
    const mockGetItem = jest.spyOn(Storage.prototype, 'getItem');
    mockGetItem.mockImplementation(() => {
      return JSON.stringify({
        expiry: new Date().getTime() + 10000,
        value: fpData,
      });
    });

    const sdk = createSdk({ projectId: 'pid', fpKey: '123', fpLoad: true });
    sdk.httpClient.post(
      '1/2/3',
      {},
      {
        headers: { test2: '123' },
        queryParams: { test2: '123' },
        token: 'session1',
      },
    );

    expect(mockFetch).toHaveBeenCalledWith(
      `https://api.descope.com/1/2/3?test2=123`,
      expect.objectContaining({
        body: JSON.stringify({ [FP_BODY_DATA]: fpData }),
        headers: new Headers({
          test2: '123',
          Authorization: 'Bearer pid:session1',
          ...descopeHeaders,
        }),
        method: 'POST',
        credentials: 'include',
      }),
    );
  });

  it('should ensure fingerprint IDs are available when needed', () => {
    const mockGetItem = jest.spyOn(Storage.prototype, 'getItem');
    const createSdk = require('../src').default;
    mockGetItem.mockImplementation(() => {
      return JSON.stringify({
        expiry: new Date().getTime() + 10000,
        value: 'mockValue',
      });
    });

    createSdk({ projectId: 'pid', fpKey: '123', fpLoad: true });
    expect(mockGetItem).toHaveBeenCalledWith(FP_STORAGE_KEY);
  });

  it('should not proceed when fingerprint key is not configured', () => {
    jest.resetModules();
    // mock ensureFingerprintIds
    jest.mock('../src/enhancers/withFingerprint/helpers', () => ({
      ensureFingerprintIds: jest.fn(),
    }));
    const createSdk = require('../src').default;

    createSdk({ projectId: 'pid' });

    // import ensureFingerprintIds and ensure it is not called
    const {
      ensureFingerprintIds,
    } = require('../src/enhancers/withFingerprint/helpers');
    expect(ensureFingerprintIds).not.toHaveBeenCalled();
  });

  it('should log a warning when not running in the browser', () => {
    jest.mock('../src/enhancers/withFingerprint/helpers', () => ({
      ensureFingerprintIds: jest.fn(),
    }));
    const origWindow = window;
    Object.defineProperty(global, 'window', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    jest.resetModules();

    const createSdk = require('../src').default;

    createSdk({ projectId: 'pid', fpKey: '123' });

    global.window = origWindow;

    // import ensureFingerprintIds and ensure it is not called
    const {
      ensureFingerprintIds,
    } = require('../src/enhancers/withFingerprint/helpers');
    expect(ensureFingerprintIds).not.toHaveBeenCalled();
    jest.resetModules();
  });
});
