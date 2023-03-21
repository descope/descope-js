import Cookies from 'js-cookie';
import {
  FP_STORAGE_KEY,
  VISITOR_REQUEST_ID_PARAM,
  VISITOR_SESSION_ID_PARAM,
} from '../src/enhancers/withFingerprint/constants';
import { LOCAL_STORAGE_LAST_USER_LOGIN_ID } from '../src/enhancers/withLastLoggedInUser/constants';
import createSdk from '../src/index';
import {
  authInfo,
  completedFlowResponse,
  flowResponse,
  mockFingerprint,
} from './mocks';
import { createMockReturnValue } from './testUtils';

const descopeHeaders = {
  'x-descope-sdk-name': 'web-js',
  'x-descope-sdk-version': global.BUILD_VERSION,
};

const mockFetch = jest.fn().mockReturnValueOnce(new Promise(() => {}));
global.fetch = mockFetch;

describe('fingerprint', () => {
  it('beforeRequest - should add visitor request and session id to outgoing requests', () => {
    const sdk = createSdk({ projectId: 'pid' });
    sdk.httpClient.get('1/2/3', {
      headers: { test2: '123' },
      queryParams: { test2: '123' },
      token: 'session1',
    });

    expect(mockFetch).toHaveBeenCalledWith(
      new URL(`https://api.descope.com/1/2/3?test2=123`),
      {
        body: undefined,
        headers: new Headers({
          test2: '123',
          Authorization: 'Bearer pid:session1',
          ...descopeHeaders,
        }),
        method: 'GET',
        credentials: 'include',
      }
    );
  });

  it('should not proceed when fingerprint key is not configured', () => {
    const warnSpy = jest.spyOn(console, 'warn');

    const origWindow = window;
    Object.defineProperty(global, 'window', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    jest.resetModules();

    const createSdk = require('../src').default;

    createSdk({ projectId: 'pid' });

    global.window = origWindow;

    jest.resetModules();

    expect(warnSpy).not.toHaveBeenCalledWith(
      'Fingerprint is a client side only capability and will not work when running in the server'
    );
  });

  it('should log a warning when not running in the browser', () => {
    const warnSpy = jest.spyOn(console, 'warn');

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

    jest.resetModules();

    expect(warnSpy).toHaveBeenCalledWith(
      'Fingerprint is a client side only capability and will not work when running in the server'
    );
  });
});
