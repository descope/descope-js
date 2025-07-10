import {
  createOAuth2Error,
  createError,
  type OAuth2Error,
  type McpError,
} from '../../src/server/errors';

describe('Error Module', () => {
  describe('createOAuth2Error', () => {
    it('should create OAuth2 error with basic structure', () => {
      const error = createOAuth2Error(401, 'invalid_token');

      expect(error).toBeInstanceOf(Error);
      expect(error.code).toBe(401);
      expect(error.oauthError.error).toBe('invalid_token');
      expect(error.wwwAuthenticate).toBe('Bearer, error="invalid_token"');
    });

    it('should include description in error', () => {
      const error = createOAuth2Error(
        401,
        'invalid_token',
        'Token has expired',
      );

      expect(error.message).toBe('Token has expired');
      expect(error.oauthError.error_description).toBe('Token has expired');
      expect(error.wwwAuthenticate).toContain(
        'error_description="Token has expired"',
      );
    });

    it('should include scope for insufficient_scope errors', () => {
      const error = createOAuth2Error(
        403,
        'insufficient_scope',
        'Missing admin scope',
        'admin:read admin:write',
      );

      expect(error.oauthError.scope).toBe('admin:read admin:write');
      expect(error.wwwAuthenticate).toContain('scope="admin:read admin:write"');
    });

    it('should handle all OAuth error types', () => {
      const errorTypes: Array<Parameters<typeof createOAuth2Error>[1]> = [
        'invalid_token',
        'insufficient_scope',
        'invalid_request',
      ];

      errorTypes.forEach((errorType) => {
        const error = createOAuth2Error(400, errorType);
        expect(error.oauthError.error).toBe(errorType);
      });
    });

    it('should build proper WWW-Authenticate header format', () => {
      const error = createOAuth2Error(
        403,
        'insufficient_scope',
        'Need more permissions',
        'read write',
      );

      expect(error.wwwAuthenticate).toBe(
        'Bearer, error="insufficient_scope", error_description="Need more permissions", scope="read write"',
      );
    });

    it('should handle missing optional parameters', () => {
      const error = createOAuth2Error(401, 'invalid_token');

      expect(error.oauthError.error_description).toBeUndefined();
      expect(error.oauthError.scope).toBeUndefined();
      expect(error.wwwAuthenticate).toBe('Bearer, error="invalid_token"');
    });

    it('should use error type as message when no description provided', () => {
      const error = createOAuth2Error(401, 'invalid_token');

      expect(error.message).toBe('invalid_token');
    });
  });

  describe('createError', () => {
    it('should create basic MCP error', () => {
      const error = createError(500, 'Internal server error');

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Internal server error');
      expect(error.code).toBe(500);
      expect(error.details).toBeUndefined();
    });

    it('should include details when provided', () => {
      const details = {
        requestId: 'req-123',
        timestamp: '2023-01-01T00:00:00Z',
      };
      const error = createError(400, 'Bad request', details);

      expect(error.details).toEqual(details);
    });

    it('should handle various error codes', () => {
      const codes = [400, 401, 403, 404, 500];

      codes.forEach((code) => {
        const error = createError(code, `Error ${code}`);
        expect(error.code).toBe(code);
      });
    });

    it('should preserve error properties', () => {
      const error = createError(422, 'Validation failed', {
        field: 'email',
        reason: 'invalid format',
      });

      expect(error.name).toBe('Error');
      expect(error.stack).toBeDefined();
      expect(error.code).toBe(422);
      expect(error.details?.field).toBe('email');
    });
  });

  describe('error type compatibility', () => {
    it('should have OAuth2Error extend Error', () => {
      const error = createOAuth2Error(401, 'invalid_token');

      expect(error instanceof Error).toBe(true);
      expect(typeof error.code).toBe('number');
      expect(typeof error.oauthError).toBe('object');
      expect(typeof error.wwwAuthenticate).toBe('string');
    });

    it('should have McpError extend Error', () => {
      const error = createError(500, 'Server error');

      expect(error instanceof Error).toBe(true);
      expect(typeof error.code).toBe('number');
    });
  });

  describe('serialization', () => {
    it('should serialize OAuth2Error properly', () => {
      const error = createOAuth2Error(
        403,
        'insufficient_scope',
        'Missing scopes',
        'admin',
      );

      const serialized = JSON.stringify(error.oauthError);
      const parsed = JSON.parse(serialized);

      expect(parsed).toEqual({
        error: 'insufficient_scope',
        error_description: 'Missing scopes',
        scope: 'admin',
      });
    });

    it('should serialize McpError details properly', () => {
      const details = { field: 'name', value: null };
      const error = createError(400, 'Validation error', details);

      const serialized = JSON.stringify(error.details);
      const parsed = JSON.parse(serialized);

      expect(parsed).toEqual(details);
    });
  });
});
