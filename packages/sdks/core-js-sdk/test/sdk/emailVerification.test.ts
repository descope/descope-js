// @ts-nocheck
import { apiPaths } from '../../src/constants';
import createSdk from '../../src/sdk';
import { mockHttpClient } from '../utils';

const sdk = createSdk(mockHttpClient);

describe('emailVerification', () => {
  afterEach(() => {
    jest.clearAllMocks();
    mockHttpClient.reset();
  });

  describe('start', () => {
    it('should send the correct request and return the nonce', async () => {
      const httpRespJson = { nonce: 'n0nce' };
      const httpResponse = {
        ok: true,
        json: () => httpRespJson,
        clone: () => ({
          json: () => Promise.resolve(httpRespJson),
        }),
        status: 200,
      };
      mockHttpClient.post.mockResolvedValue(httpResponse);

      const resp = await sdk.emailVerification.start();

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        apiPaths.emailVerification.start,
        {},
      );
      expect(resp).toEqual({
        code: 200,
        data: httpRespJson,
        ok: true,
        response: httpResponse,
      });
    });
  });
});
