import type {
  CallToolResult,
  Tool,
  TextContent,
} from '@modelcontextprotocol/sdk/types.js';
import type { OAuth2Error, AuthContext, McpRequestExtra } from './types';

export interface ToolOptions {
  name: string;
  description?: string;
  inputSchema?: Tool['inputSchema'];
  requiredScopes?: string[];
}

export interface ToolExecutionContext {
  descope: AuthContext;
  args: Record<string, unknown>;
}

export type ToolHandler = (context: ToolExecutionContext) => Promise<any>;

function createTextContent(text: string): TextContent {
  return {
    type: 'text',
    text,
  };
}

/**
 * Creates an authenticated MCP tool with automatic scope validation
 * @param options Tool configuration including name, description, and required scopes
 * @param handler Tool execution handler function
 * @returns MCP tool definition with authentication and scope enforcement
 * @example
 * ```typescript
 * const userTool = createAuthenticatedTool({
 *   name: 'get-user',
 *   description: 'Retrieve user information',
 *   requiredScopes: ['user:read'],
 *   inputSchema: {
 *     type: 'object',
 *     properties: {
 *       userId: { type: 'string' }
 *     },
 *     required: ['userId']
 *   }
 * }, async ({ args, descope }) => {
 *   return { userId: args.userId, projectId: descope.projectId };
 * });
 * ```
 */

export function createAuthenticatedTool(
  options: ToolOptions,
  handler: ToolHandler,
) {
  return {
    name: options.name,
    description: options.description,
    inputSchema: options.inputSchema || {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
    handler: async (
      args: Record<string, unknown>,
      extra: McpRequestExtra,
    ): Promise<CallToolResult> => {
      try {
        // Check if Descope context is available
        if (!extra.descope) {
          return {
            isError: true,
            code: 401,
            headers: {
              'WWW-Authenticate':
                'Bearer, error="invalid_request", error_description="Authentication required"',
            },
            content: [
              createTextContent(
                JSON.stringify(
                  {
                    error: 'unauthorized',
                    error_description: 'Authentication required',
                  },
                  null,
                  2,
                ),
              ),
            ],
          };
        }

        // Check scopes if required
        if (options.requiredScopes?.length) {
          const userScopes = extra.descope.userScopes || [];
          const missingScopes = options.requiredScopes.filter(
            (scope) => !userScopes.includes(scope),
          );

          if (missingScopes.length > 0) {
            return {
              isError: true,
              code: 403,
              headers: {
                'WWW-Authenticate': `Bearer, error="insufficient_scope", error_description="Missing required scopes: ${missingScopes.join(
                  ', ',
                )}", scope="${missingScopes.join(' ')}"`,
              },
              content: [
                createTextContent(
                  JSON.stringify(
                    {
                      error: 'insufficient_scope',
                      error_description: `Missing required scopes: ${missingScopes.join(
                        ', ',
                      )}`,
                      scope: missingScopes.join(' '),
                    },
                    null,
                    2,
                  ),
                ),
              ],
            };
          }
        }

        // Execute the tool handler
        const result = await handler({
          descope: extra.descope,
          args,
        });

        return {
          content: [
            createTextContent(
              typeof result === 'string'
                ? result
                : JSON.stringify(result, null, 2),
            ),
          ],
        };
      } catch (error) {
        const isOAuthError =
          error && typeof error === 'object' && 'oauthError' in error;

        if (isOAuthError) {
          const oauthErr = error as OAuth2Error;
          return {
            isError: true,
            code: oauthErr.code,
            headers: {
              'WWW-Authenticate': oauthErr.wwwAuthenticate,
            },
            content: [
              createTextContent(JSON.stringify(oauthErr.oauthError, null, 2)),
            ],
          };
        }

        // Handle other errors
        const isError = error && typeof error === 'object' && 'code' in error;
        return {
          isError: true,
          code: isError ? (error as any).code : 500,
          content: [
            createTextContent(
              JSON.stringify(
                {
                  error: error instanceof Error ? error.message : String(error),
                  ...(isError && { code: (error as any).code }),
                  ...(isError &&
                    (error as any).details && {
                      details: (error as any).details,
                    }),
                },
                null,
                2,
              ),
            ),
          ],
        };
      }
    },
  };
}
