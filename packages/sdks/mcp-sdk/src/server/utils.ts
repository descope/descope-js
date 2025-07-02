/**
 * Validation utilities for the MCP SDK
 */

import descopeSdk from '@descope/node-sdk';
import type { ValidationResult } from './types';

// Initialize Descope SDK - it automatically reads DESCOPE_PROJECT_ID and DESCOPE_BASE_URL from env
const descopeClient = descopeSdk({
  projectId: process.env.DESCOPE_PROJECT_ID!,
});

/**
 * Validates if user has all required scopes
 * @param required Array of required scope strings
 * @param userScopes Array of user's current scope strings
 * @returns Validation result with missing scopes if any
 * @example
 * ```typescript
 * const result = validateScopes(['admin:read'], ['admin:read', 'user:read']);
 * // result.valid === true, result.missing === []
 * ```
 */
export function validateScopes(
  required: string[],
  userScopes: string[],
): { valid: boolean; missing: string[] } {
  const missing = required.filter((scope) => !userScopes.includes(scope));
  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Default token validation using Descope SDK
 * @param token JWT token to validate
 * @returns Promise with validation result including user information
 * @example
 * ```typescript
 * const result = await validateToken('eyJhbGciOiJSUzI1NiIs...');
 * if (result.valid) {
 *   console.log('User ID:', result.userId);
 * }
 * ```
 */
export async function validateToken(token: string): Promise<ValidationResult> {
  try {
    const authInfo = await descopeClient.validateJwt(token);

    return {
      valid: true,
      projectId: authInfo.token.iss?.split('/').pop(),
      userId: authInfo.token.sub,
      scopes: (authInfo.token as { permissions?: string[] }).permissions || [],
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Token validation failed',
    };
  }
}

/**
 * Get outbound token for external application access
 * @param appId Target application ID
 * @param userId User ID requesting the token
 * @param scopes Optional scopes to request
 * @returns Promise with outbound token or null if unavailable
 * @example
 * ```typescript
 * const token = await getOutboundToken('my-app', 'user123', ['read:data']);
 * if (token) {
 *   // Use token for external API calls
 * }
 * ```
 */
export async function getOutboundToken(
  appId: string,
  userId: string,
  scopes?: string[],
): Promise<string | null> {
  try {
    const result =
      await descopeClient.management.outboundApplication.fetchTokenByScopes(
        appId,
        userId,
        scopes,
        undefined, // options
        undefined, // tenantId
      );

    if (result.ok) {
      return result.data.token;
    } else {
      console.error(
        'Outbound token exchange failed:',
        result.error?.errorMessage,
      );
      return null;
    }
  } catch (error) {
    console.error(
      'Outbound token exchange error:',
      error instanceof Error ? error.message : 'Token exchange failed',
    );
    return null;
  }
}
