import {
  validateScopes,
  validateToken as defaultValidateToken,
  getOutboundToken,
} from './utils';
import { createOAuth2Error, createError } from './errors';
import type {
  AuthMiddlewareOptions,
  AuthContext,
  McpRequestExtra,
} from './types';

/**
 * Creates MCP authentication middleware for protecting MCP endpoints
 * @param options Authentication middleware configuration options
 * @returns Async middleware function for MCP request processing
 * @example
 * ```typescript
 * const middleware = await createMcpAuthMiddleware({
 *   requiredScopes: ['admin:read']
 * });
 *
 * server.use(middleware);
 * ```
 */
export async function createMcpAuthMiddleware(
  options: AuthMiddlewareOptions = {},
) {
  const validateToken = options.validateToken || defaultValidateToken;

  return async (
    request: unknown,
    extra: McpRequestExtra,
    next: () => Promise<unknown>,
  ) => {
    if (options.skipAuth) {
      return next();
    }

    const token = extra.authInfo?.token;
    if (!token) {
      const error = createOAuth2Error(
        401,
        'invalid_request',
        'No authentication token provided',
      );
      if (options.errorHandler) {
        options.errorHandler(error);
      }
      throw error;
    }

    const validation = await validateToken(token);
    if (!validation.valid) {
      const error = createOAuth2Error(
        401,
        'invalid_token',
        validation.error || 'Invalid token',
      );
      if (options.errorHandler) {
        options.errorHandler(error);
      }
      throw error;
    }

    if (options.requiredScopes?.length) {
      const scopeValidation = validateScopes(
        options.requiredScopes,
        validation.scopes || [],
      );

      if (!scopeValidation.valid) {
        const error = createOAuth2Error(
          403,
          'insufficient_scope',
          `Missing required scopes: ${scopeValidation.missing.join(', ')}`,
          scopeValidation.missing.join(' '),
        );
        if (options.errorHandler) {
          options.errorHandler(error);
        }
        throw error;
      }
    }

    // Attach Descope context to request
    const authContext: AuthContext = {
      projectId: validation.projectId!,
      userId: validation.userId!,
      userScopes: validation.scopes || [],
      descopeToken: token,
      getOutboundToken: (appId: string, scopes?: string[]) =>
        getOutboundToken(appId, validation.userId!, scopes),
    };

    // Attach context to extra for use in handlers
    extra.descope = authContext;

    return next();
  };
}

// Re-export error functions for backwards compatibility
export { createOAuth2Error, createError } from './errors';
