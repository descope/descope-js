import {
  createOAuth2Error,
  createMcpAuthMiddleware,
  createError,
} from '../../src/server';

describe('Auth Middleware', () => {
  describe('createOAuth2Error', () => {
    it('should create OAuth error with proper structure', () => {
      const error = createOAuth2Error(401, 'invalid_token', 'Token expired');

      expect(error).toBeInstanceOf(Error);
      expect(error.code).toBe(401);
      expect(error.oauthError.error).toBe('invalid_token');
      expect(error.oauthError.error_description).toBe('Token expired');
      expect(error.wwwAuthenticate).toContain('Bearer');
      expect(error.wwwAuthenticate).toContain('error="invalid_token"');
    });

    it('should include scope in WWW-Authenticate header', () => {
      const error = createOAuth2Error(
        403,
        'insufficient_scope',
        'Missing scopes',
        'admin',
      );

      expect(error.wwwAuthenticate).toContain('scope="admin"');
    });
  });

  describe('createMcpAuthMiddleware', () => {
    let mockValidateToken: jest.Mock;
    let mockRequest: unknown;
    let mockExtra: {
      authInfo?: { token?: string };
      descope?: any;
      signal: AbortSignal;
    };
    let mockNext: jest.Mock;

    beforeEach(() => {
      mockValidateToken = jest.fn();

      mockRequest = {};
      mockExtra = {
        authInfo: { token: 'test-token' },
        signal: new AbortController().signal,
      };
      mockNext = jest.fn().mockResolvedValue('success');
    });

    it('should skip auth when skipAuth is true', async () => {
      const middleware = await createMcpAuthMiddleware({
        skipAuth: true,
        validateToken: mockValidateToken,
      });

      const result = await middleware(mockRequest, mockExtra, mockNext);

      expect(result).toBe('success');
      expect(mockNext).toHaveBeenCalled();
      expect(mockValidateToken).not.toHaveBeenCalled();
    });

    it('should throw error when no token provided', async () => {
      mockExtra.authInfo = undefined;

      const middleware = await createMcpAuthMiddleware({
        validateToken: mockValidateToken,
      });

      await expect(
        middleware(mockRequest, mockExtra, mockNext),
      ).rejects.toThrow();
    });

    it('should validate token and attach context', async () => {
      mockValidateToken.mockResolvedValue({
        valid: true,
        projectId: 'proj123',
        userId: 'user123',
        scopes: ['read', 'write'],
      });

      const middleware = await createMcpAuthMiddleware({
        validateToken: mockValidateToken,
      });

      const result = await middleware(mockRequest, mockExtra, mockNext);

      expect(result).toBe('success');
      expect(mockExtra.descope).toBeDefined();
      expect(mockExtra.descope.userId).toBe('user123');
      expect(mockExtra.descope.projectId).toBe('proj123');
    });
  });

  describe('createError', () => {
    it('should create basic error', () => {
      const error = createError(400, 'Bad request', { param: 'invalid' });

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Bad request');
      expect(error.code).toBe(400);
      expect(error.details).toEqual({ param: 'invalid' });
    });
  });
});
