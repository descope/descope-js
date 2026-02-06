import createSdk, { REFRESH_TOKEN_KEY, SESSION_TOKEN_KEY } from '../src/index';
import { flowResponse } from './mocks';
import { createMockReturnValue } from './testUtils';

const mockFetch = jest.fn().mockReturnValueOnce(new Promise(() => {}));
global.fetch = mockFetch;
Object.defineProperty(global, 'PublicKeyCredential', { value: class {} });

describe('sdk', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  it('should send start option on start call', async () => {
    const mockFetch = jest
      .fn()
      .mockReturnValue(createMockReturnValue(flowResponse));
    global.fetch = mockFetch;
    const sdk = createSdk({ projectId: 'pid' });
    await sdk.flow.start('id');
    expect(mockFetch).toBeCalledWith(
      'https://api.descope.com/v2/flow/start',
      expect.any(Object),
    );
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toMatchObject({
      options: {
        location: 'http://localhost/',
        deviceInfo: { webAuthnSupport: false },
      },
      flowId: 'id',
    });
  });

  it('should send custom redirectUrl on start call if provided', async () => {
    const mockFetch = jest
      .fn()
      .mockReturnValue(createMockReturnValue(flowResponse));
    global.fetch = mockFetch;
    const sdk = createSdk({ projectId: 'pid' });
    await sdk.flow.start('id', { redirectUrl: 'http://custom.redirect' });

    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toMatchObject({
      options: {
        redirectUrl: 'http://custom.redirect',
        startOptionsVersion: 1,
      },
      flowId: 'id',
    });
  });

  it('should send tenant in start option if provided', async () => {
    const mockFetch = jest
      .fn()
      .mockReturnValue(createMockReturnValue(flowResponse));
    global.fetch = mockFetch;
    const sdk = createSdk({ projectId: 'pid' });
    await sdk.flow.start('id', { tenant: 'yo', preview: true });
    expect(mockFetch).toBeCalledWith(
      'https://api.descope.com/v2/flow/start',
      expect.any(Object),
    );
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toMatchObject({
      options: {
        tenant: 'yo',
        preview: true,
      },
    });
  });

  it('should send oidcResource in start option if provided', async () => {
    const mockFetch = jest
      .fn()
      .mockReturnValue(createMockReturnValue(flowResponse));
    global.fetch = mockFetch;
    const sdk = createSdk({ projectId: 'pid' });
    await sdk.flow.start('id', { oidcResource: 'https://api.example.com' });
    expect(mockFetch).toBeCalledWith(
      'https://api.descope.com/v2/flow/start',
      expect.any(Object),
    );
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toMatchObject({
      options: {
        oidcResource: 'https://api.example.com',
        startOptionsVersion: 1,
      },
    });
  });

  it('should set dcs and dcr query params to false on refresh when the refresh and session token do not exist', async () => {
    localStorage.removeItem('DS'); // no session token
    localStorage.removeItem('DSR'); // no refresh token

    const mockFetch = jest
      .fn()
      .mockReturnValue(createMockReturnValue(flowResponse));
    global.fetch = mockFetch;
    const sdk = createSdk({ projectId: 'pid' });
    await sdk.refresh('token');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.descope.com/v1/auth/refresh?dcs=f&dcr=f',
      expect.any(Object),
    );
  });

  it('should set dcs query param to true on refresh when the refresh and session token exist', async () => {
    localStorage.setItem('DS', 'session-token-1'); // with session token
    localStorage.setItem('DSR', 'refresh-token-1'); // with refresh token

    const mockFetch = jest
      .fn()
      .mockReturnValue(createMockReturnValue(flowResponse));
    global.fetch = mockFetch;
    const sdk = createSdk({ projectId: 'pid' });
    await sdk.refresh('token');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.descope.com/v1/auth/refresh?dcs=t&dcr=t',
      expect.any(Object),
    );
  });

  it('should set dcs query param to true on refresh when the refresh and session token exist', async () => {
    localStorage.setItem('DS', 'session-token-1'); // with session token
    localStorage.removeItem('DSR'); // no refresh token

    const mockFetch = jest
      .fn()
      .mockReturnValue(createMockReturnValue(flowResponse));
    global.fetch = mockFetch;
    const sdk = createSdk({ projectId: 'pid' });
    await sdk.refresh('token');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.descope.com/v1/auth/refresh?dcs=t&dcr=f',
      expect.any(Object),
    );
  });

  it('should send external token when getExternalToken is passed', async () => {
    const mockFetch = jest
      .fn()
      .mockReturnValue(createMockReturnValue(flowResponse));
    global.fetch = mockFetch;
    const getExternalTokenMock = jest.fn().mockResolvedValue('external-token');

    const sdk = createSdk({
      projectId: 'pid',
      getExternalToken: getExternalTokenMock,
    });
    await sdk.refresh('token');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.descope.com/v1/auth/refresh?dcs=f&dcr=f',
      expect.objectContaining({
        body: JSON.stringify({ externalToken: 'external-token' }),
      }),
    );
  });

  it('should not fail token when getExternalToken throws error', async () => {
    const mockFetch = jest
      .fn()
      .mockReturnValue(createMockReturnValue(flowResponse));
    global.fetch = mockFetch;
    const getExternalTokenMock = jest
      .fn()
      .mockRejectedValue(new Error('error'));

    const sdk = createSdk({
      projectId: 'pid',
      getExternalToken: getExternalTokenMock,
    });
    await sdk.refresh('token');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.descope.com/v1/auth/refresh?dcs=f&dcr=f',
      expect.any(Object),
    );
  });

  it('should export constants', () => {
    expect(SESSION_TOKEN_KEY).toBeDefined();
    expect(REFRESH_TOKEN_KEY).toBeDefined();
  });
});
