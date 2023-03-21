import createSdk from '../src/index';
import sdk from '../src/sdk';
import httpClient from '../src/httpClient';
import { DEFAULT_BASE_API_URL } from '../src/constants';

jest.mock('../src/sdk', () => jest.fn());
jest.mock('../src/httpClient', () => jest.fn());

describe('sdk', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  it('should throw an error when sdk config is not an object', () => {
    expect(createSdk).toThrow('"projectId" must be a string');
  });
  it('should throw an error when projectId is missing', () => {
    expect(() => createSdk({ projectId: '' })).toThrow(
      '"projectId" must not be empty'
    );
  });
  it('should init sdk & httpClient correctly', () => {
    (httpClient as jest.Mock).mockReturnValueOnce('httpClient');
    (sdk as jest.Mock).mockReturnValueOnce('sdk');

    expect(createSdk({ projectId: '123' })).toBe('sdk');
    expect(sdk).toHaveBeenCalledWith('httpClient');
    expect(httpClient).toHaveBeenCalledWith({
      baseUrl: DEFAULT_BASE_API_URL,
      logger: undefined,
      projectId: '123',
      cookiePolicy: undefined,
      hooks: {
        afterRequest: expect.any(Function),
        beforeRequest: expect.any(Function),
      },
      baseConfig: {
        baseHeaders: {},
      },
    });
  });

  it('should override the default base url if provided', () => {
    (httpClient as jest.Mock).mockReturnValueOnce('httpClient');
    (sdk as jest.Mock).mockReturnValueOnce('sdk');

    expect(
      createSdk({ projectId: '123', baseUrl: 'http://new.base.url' })
    ).toBe('sdk');
    expect(sdk).toHaveBeenCalledWith('httpClient');
    expect(httpClient).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl: 'http://new.base.url',
      })
    );
  });

  it('should add base headers if provided', () => {
    (httpClient as jest.Mock).mockReturnValueOnce('httpClient');
    (sdk as jest.Mock).mockReturnValueOnce('sdk');

    expect(
      createSdk({ projectId: '123', baseHeaders: { header: '123' } })
    ).toBe('sdk');
    expect(sdk).toHaveBeenCalledWith('httpClient');
    expect(httpClient).toHaveBeenCalledWith(
      expect.objectContaining({
        baseConfig: { baseHeaders: { header: '123' } },
      })
    );
  });

  it('should add rate limit to the response error', async () => {
    const createSdk1 = jest.requireActual('../src/sdk').default;
    const httpResp = {
      status: 429,
      clone: () => httpResp,
      json: () => ({ error: 'error' }),
      headers: new Headers({ 'retry-after': '10' }),
    };
    const httpClient = { post: () => httpResp };
    const sdk = createSdk1(httpClient);

    const resp = await sdk.otp.signIn.email('1@1.com');

    expect(resp.error).toMatchObject({ retryAfter: 10 });
  });

  it('should set rate limit to 0 when there is no header', async () => {
    const createSdk1 = jest.requireActual('../src/sdk').default;
    const httpResp = {
      status: 429,
      clone: () => httpResp,
      json: () => ({ error: 'error' }),
    };
    const httpClient = { post: () => httpResp };
    const sdk = createSdk1(httpClient);

    const resp = await sdk.otp.signIn.email('1@1.com');

    expect(resp.error).toMatchObject({ retryAfter: 0 });
  });
});
