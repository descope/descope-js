import { ExchangeAccessKeyResponse, SdkResponse } from '../../src';
import { apiPaths } from '../../src/constants';
import createSdk from '../../src/sdk';
import { mockHttpClient } from '../utils';

const sdk = createSdk(mockHttpClient);

const mockAccessKeyResponse: ExchangeAccessKeyResponse = {
  keyId: 'foo',
  sessionJwt: 'bar',
  expiration: 2000000000,
};

describe('accesskey', () => {
  afterEach(() => {
    jest.clearAllMocks();
    mockHttpClient.reset();
  });

  describe('start', () => {
    it('should throw an error when accessKey is not a string', () => {
      expect(sdk.accessKey.exchange).toThrow('"accessKey" must be a string');
    });

    it('should throw an error when accessKey is empty', () => {
      expect(() => sdk.accessKey.exchange('')).toThrow(
        '"accessKey" must not be empty'
      );
    });

    it('should send the correct request', () => {
      const httpResponse = {
        ok: true,
        json: () => mockAccessKeyResponse,
        clone: () => ({
          json: () => Promise.resolve(mockAccessKeyResponse),
        }),
        status: 200,
      };
      mockHttpClient.get.mockResolvedValue(httpResponse);

      sdk.accessKey.exchange('key');

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        apiPaths.accessKey.exchange,
        {},
        {
          token: 'key',
        }
      );
    });

    it('should return the correct response', async () => {
      const httpResponse = {
        ok: true,
        json: () => mockAccessKeyResponse,
        clone: () => ({
          json: () => Promise.resolve(mockAccessKeyResponse),
        }),
        status: 200,
      };
      mockHttpClient.post.mockResolvedValue(httpResponse);

      const resp: SdkResponse<ExchangeAccessKeyResponse> =
        await sdk.accessKey.exchange('key');

      expect(resp).toEqual({
        code: 200,
        data: mockAccessKeyResponse,
        ok: true,
        response: httpResponse,
      });
    });
  });
});
