// Type exports
export * from './types';

// Validation exports
export { validateScopes, validateToken, getOutboundToken } from './utils';

// Authentication exports
export { createMcpAuthMiddleware } from './auth';

// Error exports
export {
  createOAuth2Error,
  createError,
  type McpError,
  type OAuth2Error,
} from './errors';

// Tool Builder exports
export {
  createAuthenticatedTool,
  type ToolOptions,
  type ToolExecutionContext,
  type ToolHandler,
} from './tool-builder';

// Resource Metadata exports
export * from './oauth/resource-metadata/types';
export {
  buildWWWAuthenticate,
  parseWWWAuthenticate,
} from './oauth/resource-metadata/www-authenticate';
export { buildResourceMetadata } from './oauth/resource-metadata/metadata';
