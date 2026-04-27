import { decodeProjectCreatedAt } from '@descope/sdk-helpers';
import createSdk from '../src/index';
import { SKIP_INITIAL_REFRESH_FOR_PROJECTS_AFTER } from '../src/constants';
import { createMockReturnValue } from './testUtils';
import { flowResponse } from './mocks';

jest.mock('@descope/sdk-helpers', () => ({
  ...jest.requireActual('@descope/sdk-helpers'),
  decodeProjectCreatedAt: jest.fn(),
}));

const mockDecodeProjectCreatedAt = decodeProjectCreatedAt as jest.Mock;

globalThis.Headers = class Headers {
  constructor(obj: object) {
    return Object.assign({}, obj);
  }
} as any;

jest.mock('js-cookie', () => ({
  set: jest.fn(),
  get: jest.fn(),
  remove: jest.fn(),
}));

const OLD_PROJECT_TS = SKIP_INITIAL_REFRESH_FOR_PROJECTS_AFTER - 1;
const NEW_PROJECT_TS = SKIP_INITIAL_REFRESH_FOR_PROJECTS_AFTER + 1;

describe('sdk.refresh skipIfNoSession', () => {
  let mockFetch: jest.Mock;

  beforeEach(() => {
    localStorage.clear();
    mockDecodeProjectCreatedAt.mockReset();
    mockFetch = jest.fn().mockReturnValue(createMockReturnValue(flowResponse));
    global.fetch = mockFetch;
  });

  it('calls fetch when skipIfNoSession is not passed (back-compat)', async () => {
    const sdk = createSdk({ projectId: 'pid', persistTokens: true });
    await sdk.refresh(undefined, true);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('calls fetch when session token is present in localStorage', async () => {
    localStorage.setItem('DS', 'session-token');
    const sdk = createSdk({ projectId: 'pid', persistTokens: true });
    await sdk.refresh(undefined, true, { skipIfNoSession: true });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('calls fetch when refresh token is present in localStorage', async () => {
    localStorage.setItem('DSR', 'refresh-token');
    const sdk = createSdk({ projectId: 'pid', persistTokens: true });
    await sdk.refresh(undefined, true, { skipIfNoSession: true });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('calls fetch when getExternalToken is configured', async () => {
    const sdk = createSdk({
      projectId: 'pid',
      persistTokens: true,
      getExternalToken: jest.fn().mockResolvedValue('ext-token'),
    });
    await sdk.refresh(undefined, true, { skipIfNoSession: true });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('calls fetch when last auth status is "auth"', async () => {
    localStorage.setItem('DSP_LAST_AUTH_pid', 'auth');
    const sdk = createSdk({ projectId: 'pid', persistTokens: true });
    await sdk.refresh(undefined, true, { skipIfNoSession: true });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('skips fetch and returns {ok:true} when last auth status is "unauth"', async () => {
    localStorage.setItem('DSP_LAST_AUTH_pid', 'unauth');
    const sdk = createSdk({ projectId: 'pid', persistTokens: true });
    const result = await sdk.refresh(undefined, true, {
      skipIfNoSession: true,
    });
    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.ok).toBe(true);
  });

  it('calls fetch (bootstrap) when flag absent and project is old', async () => {
    mockDecodeProjectCreatedAt.mockReturnValue(OLD_PROJECT_TS);
    const sdk = createSdk({ projectId: 'pid', persistTokens: true });
    await sdk.refresh(undefined, true, { skipIfNoSession: true });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('skips fetch and returns {ok:true} when flag absent and project is new', async () => {
    mockDecodeProjectCreatedAt.mockReturnValue(NEW_PROJECT_TS);
    const sdk = createSdk({ projectId: 'pid', persistTokens: true });
    const result = await sdk.refresh(undefined, true, {
      skipIfNoSession: true,
    });
    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.ok).toBe(true);
  });

  it('calls fetch when flag absent and projectId is too short to decode (safe default)', async () => {
    // 'pid' is only 3 chars — decodeProjectCreatedAt returns null
    mockDecodeProjectCreatedAt.mockReturnValue(null);
    const sdk = createSdk({ projectId: 'pid', persistTokens: true });
    await sdk.refresh(undefined, true, { skipIfNoSession: true });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
