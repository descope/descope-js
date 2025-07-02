/**
 * Error handling utilities for the MCP SDK
 */

import type { OAuth2Error, OAuthError } from './types';

/**
 * Creates an OAuth 2.0 error with proper structure and WWW-Authenticate header
 * @param code HTTP status code
 * @param error OAuth error type
 * @param description Optional error description
 * @param requiredScope Optional required scope for insufficient_scope errors
 * @returns OAuth 2.0 compliant error object
 * @example
 * ```typescript
 * const error = createOAuth2Error(401, 'invalid_token', 'Token has expired');
 * // Error includes proper WWW-Authenticate header and OAuth structure
 * ```
 */
export function createOAuth2Error(
  code: number,
  error: OAuthError['error'],
  description?: string,
  requiredScope?: string,
): OAuth2Error {
  const err = new Error(description || error) as OAuth2Error;
  err.code = code;
  err.oauthError = {
    error,
    error_description: description,
    scope: requiredScope,
  };

  // Build WWW-Authenticate header
  const parts = ['Bearer'];
  parts.push(`error="${error}"`);
  if (description) parts.push(`error_description="${description}"`);
  if (requiredScope) parts.push(`scope="${requiredScope}"`);
  err.wwwAuthenticate = parts.join(', ');

  return err;
}

export interface McpError extends Error {
  code: number;
  details?: Record<string, unknown>;
}

/**
 * Creates a generic MCP error
 * @param code HTTP status code
 * @param message Error message
 * @param details Optional error details
 * @returns MCP error object
 * @example
 * ```typescript
 * const error = createError(500, 'Internal server error', { requestId: '123' });
 * ```
 */
export function createError(
  code: number,
  message: string,
  details?: Record<string, unknown>,
): McpError {
  const error = new Error(message) as McpError;
  error.code = code;
  error.details = details;
  return error;
}

// Export the OAuth2Error type
export type { OAuth2Error } from './types';
