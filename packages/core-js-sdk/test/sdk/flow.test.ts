// @ts-nocheck
import createSdk from '../../src/sdk';
import { mockHttpClient } from '../utils';

const sdk = createSdk(mockHttpClient);

describe('Flows', () => {
  afterEach(() => {
    jest.clearAllMocks();
    mockHttpClient.reset();
  });
  describe('start', () => {
    it('should throw an error when flowName is not a string', () => {
      expect(sdk.flow.start).toThrow('"flowId" must be a string');
    });

    it('should throw an error when flowName is empty', () => {
      expect(() => sdk.flow.start('')).toThrow('"flowId" must not be empty');
    });

    it('should send the correct request', async () => {
      await sdk.flow.start('flow1');
      expect(mockHttpClient.post).toHaveBeenCalledWith('/v1/flow/start', {
        flowId: 'flow1',
      });
    });

    it('should return the correct response', async () => {
      const httpRespJson = {
        flowId: 'f1',
        taskId: 't1',
        status: 'completed',
        screenId: 'screen1',
      };
      const httpResponse = {
        ok: true,
        json: () => httpRespJson,
        clone: () => ({
          json: () => Promise.resolve(httpRespJson),
        }),
        status: 200,
      };
      mockHttpClient.post.mockResolvedValue(httpResponse);
      const resp = await sdk.flow.start('flow1');

      expect(resp).toEqual({
        code: 200,
        data: httpRespJson,
        ok: true,
        response: httpResponse,
      });
    });
  });

  describe('next', () => {
    it('should throw an error when executionId is not a string', () => {
      expect(() => sdk.flow.next(undefined, 's1', 'a1')).toThrow(
        '"executionId" must be a string'
      );
    });

    it('should throw an error when executionId is empty', () => {
      expect(() => sdk.flow.next('', 's1', 'a1')).toThrow(
        '"executionId" must not be empty'
      );
    });

    it('should throw an error when stepId is not a string', () => {
      expect(() => sdk.flow.next('f1', undefined, 'a1')).toThrow(
        '"stepId" must be a string'
      );
    });

    it('should throw an error when stepId is empty', () => {
      expect(() => sdk.flow.next('f1', '', 'a1')).toThrow(
        '"stepId" must not be empty'
      );
    });

    it('should throw an error when interactionId is not a string', () => {
      expect(() => sdk.flow.next('f1', 's1', undefined)).toThrow(
        '"interactionId" must be a string'
      );
    });

    it('should throw an error when interactionId is empty', () => {
      expect(() => sdk.flow.next('f1', 's1', '')).toThrow(
        '"interactionId" must not be empty'
      );
    });

    it('should send the correct request without input', async () => {
      await sdk.flow.next('e1', 's1', 'a1');
      expect(mockHttpClient.post).toHaveBeenCalledWith('/v1/flow/next', {
        executionId: 'e1',
        stepId: 's1',
        interactionId: 'a1',
      });
    });

    it('should send the correct request with input', () => {
      const input = { key1: 'val1' };
      sdk.flow.next('e1', 's1', 'a1', input);
      expect(mockHttpClient.post).toHaveBeenCalledWith('/v1/flow/next', {
        executionId: 'e1',
        stepId: 's1',
        interactionId: 'a1',
        input,
      });
    });

    it('should return the correct response', async () => {
      const httpRespJson = {
        executionId: 'e1',
        stepId: 's1',
        status: 'completed',
        screenId: 'screen1',
      };
      const httpResponse = {
        ok: true,
        json: () => httpRespJson,
        clone: () => ({
          json: () => Promise.resolve(httpRespJson),
        }),
        status: 200,
      };
      mockHttpClient.post.mockResolvedValue(httpResponse);
      const resp = await sdk.flow.next('e1', 's1', 'a1');

      expect(resp).toEqual({
        code: 200,
        data: httpRespJson,
        ok: true,
        response: httpResponse,
      });
    });
  });
});
