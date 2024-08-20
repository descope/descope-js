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
      'https://api.descope.com/v1/flow/start',
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
      'https://api.descope.com/v1/flow/start',
      expect.any(Object),
    );
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toMatchObject({
      options: {
        tenant: 'yo',
        preview: true,
      },
    });
  });

  it('should set dsc query param to false on refresh when the session token does not exist', async () => {
    localStorage.removeItem('DS'); // no session token

    const mockFetch = jest
      .fn()
      .mockReturnValue(createMockReturnValue(flowResponse));
    global.fetch = mockFetch;
    const sdk = createSdk({ projectId: 'pid' });
    await sdk.refresh('token');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.descope.com/v1/auth/refresh?dcs=f',
      expect.any(Object),
    );
  });

  it('should set dcs query param to true on refresh when the session token exists', async () => {
    localStorage.setItem('DS', 'refresh-token-1'); // with session token

    const mockFetch = jest
      .fn()
      .mockReturnValue(createMockReturnValue(flowResponse));
    global.fetch = mockFetch;
    const sdk = createSdk({ projectId: 'pid' });
    await sdk.refresh('token');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.descope.com/v1/auth/refresh?dcs=t',
      expect.any(Object),
    );
  });

  it('should export constants', () => {
    expect(SESSION_TOKEN_KEY).toBeDefined();
    expect(REFRESH_TOKEN_KEY).toBeDefined();
  });
});
