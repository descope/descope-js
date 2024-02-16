import {
  LOCAL_STORAGE_LAST_USER_DISPLAY_NAME,
  LOCAL_STORAGE_LAST_USER_LOGIN_ID,
} from '../src/enhancers/withLastLoggedInUser/constants';
import createSdk from '../src/index';
import { authInfo, completedFlowResponse, flowResponse } from './mocks';
import { createMockReturnValue } from './testUtils';

const mockFetch = jest.fn().mockReturnValueOnce(new Promise(() => {}));
global.fetch = mockFetch;
Object.defineProperty(global, 'PublicKeyCredential', { value: class {} });

describe('lastLoggedInUser', () => {
  beforeEach(() => {
    localStorage.removeItem(LOCAL_STORAGE_LAST_USER_LOGIN_ID);
    localStorage.removeItem(LOCAL_STORAGE_LAST_USER_DISPLAY_NAME);
  });
  it('should send last user in start option if set', async () => {
    localStorage.setItem(LOCAL_STORAGE_LAST_USER_LOGIN_ID, 'chris');
    localStorage.setItem(LOCAL_STORAGE_LAST_USER_DISPLAY_NAME, 'Chris Prat');
    const mockFetch = jest
      .fn()
      .mockReturnValue(createMockReturnValue(flowResponse));
    global.fetch = mockFetch;
    const sdk = createSdk({ projectId: 'pid' });
    await sdk.flow.start('id', { tenant: 'yo' });
    expect(mockFetch).toBeCalledWith(
      expect.objectContaining({
        href: 'https://api.descope.com/v1/flow/start',
      }),
      expect.any(Object),
    );
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toMatchObject({
      options: {
        lastAuth: {
          loginId: 'chris',
          name: 'Chris Prat',
        },
      },
    });
  });

  it('should set local storage on completed start response', async () => {
    const mockFetch = jest
      .fn()
      .mockReturnValue(createMockReturnValue(completedFlowResponse));
    global.fetch = mockFetch;
    const sdk = createSdk({ projectId: 'pid' });
    await sdk.flow.start('id');
    expect(mockFetch).toBeCalledWith(
      expect.objectContaining({
        href: 'https://api.descope.com/v1/flow/start',
      }),
      expect.any(Object),
    );
    expect(localStorage.getItem(LOCAL_STORAGE_LAST_USER_LOGIN_ID)).toBe(
      completedFlowResponse.authInfo.user.loginIds[0],
    );
    expect(localStorage.getItem(LOCAL_STORAGE_LAST_USER_DISPLAY_NAME)).toBe(
      completedFlowResponse.authInfo.user.name,
    );
  });
  it('should set local storage on completed next response', async () => {
    const mockReturnVal = Promise.resolve(
      createMockReturnValue(completedFlowResponse),
    );
    const mockFetch = jest.fn().mockReturnValue(mockReturnVal);
    global.fetch = mockFetch;
    const sdk = createSdk({ projectId: 'pid' });
    await sdk.flow.next('id', 'stepId', 'interactionId');
    expect(mockFetch).toBeCalledWith(
      expect.objectContaining({ href: 'https://api.descope.com/v1/flow/next' }),
      expect.any(Object),
    );
    expect(localStorage.getItem(LOCAL_STORAGE_LAST_USER_LOGIN_ID)).toBe(
      completedFlowResponse.authInfo.user.loginIds[0],
    );
    expect(localStorage.getItem(LOCAL_STORAGE_LAST_USER_DISPLAY_NAME)).toBe(
      completedFlowResponse.authInfo.user.name,
    );
  });
  it('should remove last user data on logout', async () => {
    localStorage.setItem(LOCAL_STORAGE_LAST_USER_LOGIN_ID, 'chris');
    localStorage.setItem(LOCAL_STORAGE_LAST_USER_DISPLAY_NAME, 'Chris Prat');
    // mock one response with auth info, and another one for logout
    const mockFetch = jest
      .fn()
      .mockReturnValueOnce(createMockReturnValue(authInfo))
      .mockReturnValue(createMockReturnValue({}));
    global.fetch = mockFetch;

    const sdk = createSdk({ projectId: 'pid', persistTokens: true });

    // Call something to simulate auth info
    await sdk.httpClient.get('1/2/3');

    await sdk.logout(authInfo.refreshJwt);

    expect(localStorage.getItem(LOCAL_STORAGE_LAST_USER_LOGIN_ID)).toBeFalsy();
    expect(
      localStorage.getItem(LOCAL_STORAGE_LAST_USER_DISPLAY_NAME),
    ).toBeFalsy();
  });

  it('should not set local storage when flag is false', async () => {
    const mockFetch = jest
      .fn()
      .mockReturnValue(createMockReturnValue(completedFlowResponse));
    global.fetch = mockFetch;
    const sdk = createSdk({
      projectId: 'pid',
      storeLastAuthenticatedUser: false,
    });
    await sdk.flow.start('id');
    expect(mockFetch).toBeCalledWith(
      expect.objectContaining({
        href: 'https://api.descope.com/v1/flow/start',
      }),
      expect.any(Object),
    );
    expect(localStorage.getItem(LOCAL_STORAGE_LAST_USER_LOGIN_ID)).toBeFalsy();
    expect(
      localStorage.getItem(LOCAL_STORAGE_LAST_USER_DISPLAY_NAME),
    ).toBeFalsy();

    expect((sdk as any).getLastUserLoginId).toBeFalsy();
    expect((sdk as any).getLastUserDisplayName).toBeFalsy();
  });
});
