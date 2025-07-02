import { createAuthenticatedTool } from '../../src/server/tool-builder';
import type { McpRequestExtra, AuthContext } from '../../src/server/types';

describe('Tool Builder', () => {
  let mockAuthContext: AuthContext;
  let mockExtra: McpRequestExtra;

  beforeEach(() => {
    mockAuthContext = {
      projectId: 'test-project',
      userId: 'test-user',
      userScopes: ['read', 'write'],
      descopeToken: 'test-token',
      getOutboundToken: jest.fn().mockResolvedValue('outbound-token'),
    };

    mockExtra = {
      signal: new AbortController().signal,
      descope: mockAuthContext,
    };
  });

  describe('createAuthenticatedTool', () => {
    it('should create a tool with correct structure', () => {
      const tool = createAuthenticatedTool(
        {
          name: 'test-tool',
          description: 'A test tool',
          inputSchema: {
            type: 'object',
            properties: {
              param: { type: 'string' },
            },
          },
        },
        async ({ args, descope }) => ({
          success: true,
          args,
          projectId: descope.projectId,
        }),
      );

      expect(tool.name).toBe('test-tool');
      expect(tool.description).toBe('A test tool');
      expect(tool.inputSchema).toEqual({
        type: 'object',
        properties: {
          param: { type: 'string' },
        },
      });
      expect(typeof tool.handler).toBe('function');
    });

    it('should use default inputSchema when not provided', () => {
      const tool = createAuthenticatedTool(
        {
          name: 'test-tool',
        },
        async ({ args }) => ({ success: true }),
      );

      expect(tool.inputSchema).toEqual({
        type: 'object',
        properties: {},
        additionalProperties: false,
      });
    });

    it('should execute handler with valid auth context', async () => {
      const mockHandler = jest.fn().mockResolvedValue({ success: true });
      const tool = createAuthenticatedTool(
        {
          name: 'test-tool',
          description: 'Test tool',
        },
        mockHandler,
      );

      const result = await tool.handler({ param: 'value' }, mockExtra);

      expect(mockHandler).toHaveBeenCalledWith({
        descope: mockAuthContext,
        args: { param: 'value' },
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: JSON.stringify({ success: true }, null, 2),
          },
        ],
      });
    });

    it('should return string results directly', async () => {
      const tool = createAuthenticatedTool(
        {
          name: 'test-tool',
        },
        async () => 'simple string result',
      );

      const result = await tool.handler({}, mockExtra);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'simple string result',
          },
        ],
      });
    });

    it('should return 401 when no auth context provided', async () => {
      const tool = createAuthenticatedTool(
        {
          name: 'test-tool',
        },
        async () => ({ success: true }),
      );

      const result = await tool.handler(
        {},
        {
          signal: new AbortController().signal,
        },
      );

      expect(result).toEqual({
        isError: true,
        code: 401,
        headers: {
          'WWW-Authenticate':
            'Bearer, error="invalid_request", error_description="Authentication required"',
        },
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: 'unauthorized',
                error_description: 'Authentication required',
              },
              null,
              2,
            ),
          },
        ],
      });
    });

    it('should return 403 when required scopes are missing', async () => {
      const tool = createAuthenticatedTool(
        {
          name: 'test-tool',
          requiredScopes: ['admin', 'write'],
        },
        async () => ({ success: true }),
      );

      const result = await tool.handler({}, mockExtra);

      expect(result).toEqual({
        isError: true,
        code: 403,
        headers: {
          'WWW-Authenticate':
            'Bearer, error="insufficient_scope", error_description="Missing required scopes: admin", scope="admin"',
        },
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: 'insufficient_scope',
                error_description: 'Missing required scopes: admin',
                scope: 'admin',
              },
              null,
              2,
            ),
          },
        ],
      });
    });

    it('should execute when user has all required scopes', async () => {
      const tool = createAuthenticatedTool(
        {
          name: 'test-tool',
          requiredScopes: ['read', 'write'],
        },
        async () => ({ success: true }),
      );

      const result = await tool.handler({}, mockExtra);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: JSON.stringify({ success: true }, null, 2),
          },
        ],
      });
    });

    it('should handle OAuth2 errors', async () => {
      const oauthError = {
        oauthError: {
          error: 'invalid_token',
          error_description: 'Token expired',
        },
        code: 401,
        wwwAuthenticate: 'Bearer, error="invalid_token"',
      };

      const tool = createAuthenticatedTool(
        {
          name: 'test-tool',
        },
        async () => {
          throw oauthError;
        },
      );

      const result = await tool.handler({}, mockExtra);

      expect(result).toEqual({
        isError: true,
        code: 401,
        headers: {
          'WWW-Authenticate': 'Bearer, error="invalid_token"',
        },
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: 'invalid_token',
                error_description: 'Token expired',
              },
              null,
              2,
            ),
          },
        ],
      });
    });

    it('should handle generic errors', async () => {
      const tool = createAuthenticatedTool(
        {
          name: 'test-tool',
        },
        async () => {
          throw new Error('Something went wrong');
        },
      );

      const result = await tool.handler({}, mockExtra);

      expect(result).toEqual({
        isError: true,
        code: 500,
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: 'Something went wrong',
              },
              null,
              2,
            ),
          },
        ],
      });
    });

    it('should handle errors with code property', async () => {
      const customError = new Error('Custom error') as any;
      customError.code = 400;
      customError.details = { field: 'invalid' };

      const tool = createAuthenticatedTool(
        {
          name: 'test-tool',
        },
        async () => {
          throw customError;
        },
      );

      const result = await tool.handler({}, mockExtra);

      expect(result).toEqual({
        isError: true,
        code: 400,
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: 'Custom error',
                code: 400,
                details: { field: 'invalid' },
              },
              null,
              2,
            ),
          },
        ],
      });
    });
  });
});
