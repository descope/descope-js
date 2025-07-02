import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type { ServerRequest } from '@modelcontextprotocol/sdk/types.js';

export interface OAuthError {
  error: 'invalid_token' | 'insufficient_scope' | 'invalid_request';
  error_description?: string;
  error_uri?: string;
  scope?: string;
}

export interface OAuth2Error extends Error {
  code: number;
  oauthError: OAuthError;
  wwwAuthenticate: string;
}

export interface ValidationResult {
  valid: boolean;
  projectId?: string;
  userId?: string;
  scopes?: string[];
  error?: string;
}

export interface AuthContext {
  projectId: string;
  userId: string;
  userScopes: string[];
  descopeToken: string;
  getOutboundToken: (
    appId: string,
    scopes?: string[],
  ) => Promise<string | null>;
}

export interface AuthMiddlewareOptions {
  skipAuth?: boolean;
  requiredScopes?: string[];
  validateToken?: (token: string) => Promise<ValidationResult>;
  errorHandler?: (error: OAuth2Error) => void;
}

export interface McpRequestExtra extends RequestHandlerExtra {
  authInfo?: {
    token?: string;
  };
  descope?: AuthContext;
}

export type McpMiddleware = (
  request: ServerRequest,
  extra: McpRequestExtra,
  next: () => Promise<unknown>,
) => Promise<unknown>;
