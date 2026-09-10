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
        isCustomScreen: false,
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
        '"executionId" must be a string',
      );
    });

    it('should throw an error when executionId is empty', () => {
      expect(() => sdk.flow.next('', 's1', 'a1')).toThrow(
        '"executionId" must not be empty',
      );
    });

    it('should throw an error when stepId is not a string', () => {
      expect(() => sdk.flow.next('f1', undefined, 'a1')).toThrow(
        '"stepId" must be a string',
      );
    });

    it('should throw an error when stepId is empty', () => {
      expect(() => sdk.flow.next('f1', '', 'a1')).toThrow(
        '"stepId" must not be empty',
      );
    });

    it('should throw an error when interactionId is not a string', () => {
      expect(() => sdk.flow.next('f1', 's1', undefined)).toThrow(
        '"interactionId" must be a string',
      );
    });

    it('should throw an error when interactionId is empty', () => {
      expect(() => sdk.flow.next('f1', 's1', '')).toThrow(
        '"interactionId" must not be empty',
      );
    });

    it('should send the correct request without input', async () => {
      await sdk.flow.next('e1', 's1', 'a1');
      expect(mockHttpClient.post).toHaveBeenCalledWith('/v1/flow/next', {
        executionId: 'e1',
        stepId: 's1',
        interactionId: 'a1',
        isCustomScreen: false,
      });
    });

    it('should send the correct request with input', () => {
      const input = { key1: 'val1' };
      sdk.flow.next('e1', 's1', 'a1', 'v1', 'cv1', input);
      expect(mockHttpClient.post).toHaveBeenCalledWith('/v1/flow/next', {
        executionId: 'e1',
        stepId: 's1',
        interactionId: 'a1',
        input,
        version: 'v1',
        componentsVersion: 'cv1',
        isCustomScreen: false,
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

  describe('event', () => {
    it('should send the events for the execution', async () => {
      const httpResponse = {
        ok: true,
        json: () => ({}),
        clone: () => ({ json: () => Promise.resolve({}) }),
        status: 200,
      };
      mockHttpClient.post.mockResolvedValue(httpResponse);
      const events = [
        {
          id: '1',
          field: 'email',
          rule: 'format',
          message: 'Must be a valid email',
          screenId: 'scr-1',
          screenName: 'Welcome Screen',
          ts: 1730900000000,
        },
      ];

      const resp = await sdk.flow.event('e1', events);

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/v1/flow/event',
        { executionId: 'e1', events },
        { keepalive: undefined },
      );
      expect(resp.ok).toBe(true);
    });

    it('should pass keepalive so a final batch survives the page closing', async () => {
      mockHttpClient.post.mockResolvedValue({
        ok: true,
        json: () => ({}),
        clone: () => ({ json: () => Promise.resolve({}) }),
        status: 200,
      });

      await sdk.flow.event('e1', [], true);

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/v1/flow/event',
        expect.anything(),
        { keepalive: true },
      );
    });

    it('should reject an empty execution id', () => {
      // validations throw synchronously, before any request is made
      expect(() => sdk.flow.event('', [])).toThrow(
        '"executionId" must not be empty',
      );
    });
  });
});
