/**
 * Next.js Pages Router Protected Resource Metadata Example
 *
 * This example shows how to implement OAuth 2.0 Protected Resource Metadata (RFC 9728)
 * in Next.js using the Pages Router and the Descope MCP SDK.
 *
 * To use this example:
 * 1. Install Next.js: npm install next react react-dom @types/react @types/react-dom
 * 2. Create the appropriate API route files in your Next.js pages/api directory
 * 3. Set DESCOPE_PROJECT_ID environment variable
 *
 * File structure:
 * - pages/.well-known/oauth-protected-resource.ts
 * - pages/api/protected.ts
 * - pages/api/mcp-tools/[tool].ts
 */

import {
  buildResourceMetadata,
  buildWWWAuthenticate,
  createMcpAuthMiddleware,
  createAuthenticatedTool,
} from '@descope/mcp-sdk';

// Type definitions for Next.js API (when available)
interface NextApiRequest {
  method?: string;
  headers: {
    authorization?: string;
  };
  query: {
    [key: string]: string | string[];
  };
  body?: any;
}

interface NextApiResponse {
  status: (statusCode: number) => NextApiResponse;
  json: (data: any) => void;
  setHeader: (name: string, value: string) => NextApiResponse;
}

// Configuration
const DESCOPE_PROJECT_ID = process.env.DESCOPE_PROJECT_ID!;
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://yourdomain.com';

// Resource configuration for MCP compliance
const resourceConfig = {
  resource: API_BASE_URL,
  authorizationServers: [`https://auth.descope.com/${DESCOPE_PROJECT_ID}`],
  scopes: ['mcp:read', 'mcp:write', 'user:profile', 'admin:manage'],
  docsUrl: `${API_BASE_URL}/docs`,
};

// ================================
// 1. OAuth Protected Resource Metadata Endpoint
// File: pages/.well-known/oauth-protected-resource.ts
// ================================

// Option A: Public metadata endpoint (common approach)
export async function metadataHandler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const metadata = buildResourceMetadata(resourceConfig);

    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Content-Type', 'application/json');

    return res.status(200).json(metadata);
  } catch (error) {
    console.error('Error generating resource metadata:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Option B: Protected metadata endpoint (higher security)
export async function protectedMetadataHandler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      const wwwAuth = buildWWWAuthenticate({
        error: 'invalid_request',
        error_description: 'Authorization required to access metadata',
      });

      res.setHeader('WWW-Authenticate', wwwAuth);
      return res.status(401).json({
        error: 'invalid_request',
        error_description: 'Authorization required to access metadata',
      });
    }

    // Validate token (basic validation, no specific scopes required for metadata)
    const authMiddleware = await createMcpAuthMiddleware({
      requiredScopes: [], // No specific scopes required for metadata
    });

    const mockRequest = { method: req.method };
    const mockExtra = {
      signal: new AbortController().signal,
      authInfo: { token },
      descope: undefined as any,
    };

    await authMiddleware(mockRequest, mockExtra, async () => {
      // Token is valid
    });

    const metadata = buildResourceMetadata({
      resource: API_BASE_URL,
      authorizationServers: [`https://auth.descope.com/${DESCOPE_PROJECT_ID}`],
      scopes: ['mcp:read', 'mcp:write', 'user:profile', 'admin:manage'],
      docsUrl: `${API_BASE_URL}/docs`,
    });

    res.setHeader('Cache-Control', 'private, max-age=300');
    res.setHeader('Content-Type', 'application/json');

    return res.status(200).json(metadata);
  } catch (error: any) {
    if (error.code && error.oauthError) {
      res.setHeader('WWW-Authenticate', error.wwwAuthenticate);
      return res.status(error.code).json(error.oauthError);
    }

    const wwwAuth = buildWWWAuthenticate({
      error: 'invalid_token',
      error_description: 'Token validation failed',
    });

    res.setHeader('WWW-Authenticate', wwwAuth);
    return res.status(401).json({
      error: 'invalid_token',
      error_description: 'Token validation failed',
    });
  }
}

// ================================
// 2. Protected API Route with Scope Validation
// File: pages/api/protected.ts
// ================================

export async function protectedApiHandler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      const wwwAuth = buildWWWAuthenticate({
        error: 'invalid_request',
        error_description: 'Authorization header required',
      });

      res.setHeader('WWW-Authenticate', wwwAuth);
      return res.status(401).json({
        error: 'invalid_request',
        error_description: 'Authorization header required',
      });
    }

    const authMiddleware = await createMcpAuthMiddleware({
      requiredScopes: ['mcp:read'],
    });

    const mockRequest = { method: req.method };
    const mockExtra = {
      signal: new AbortController().signal,
      authInfo: { token },
      descope: undefined as any,
    };

    await authMiddleware(mockRequest, mockExtra, async () => {
      // Middleware passed - user is authenticated with required scopes
    });

    return res.status(200).json({
      message: 'Access granted to protected resource',
      userId: mockExtra.descope?.userId,
      projectId: mockExtra.descope?.projectId,
      scopes: mockExtra.descope?.userScopes,
      timestamp: new Date().toISOString(),
      method: req.method,
    });
  } catch (error: any) {
    if (error.code && error.oauthError) {
      res.setHeader('WWW-Authenticate', error.wwwAuthenticate);
      return res.status(error.code).json(error.oauthError);
    }

    const wwwAuth = buildWWWAuthenticate({
      error: 'invalid_token',
      error_description: 'Token validation failed',
    });

    res.setHeader('WWW-Authenticate', wwwAuth);
    return res.status(401).json({
      error: 'invalid_token',
      error_description: 'Token validation failed',
    });
  }
}

// ================================
// 3. Dynamic MCP Tools API Route
// File: pages/api/mcp-tools/[tool].ts
// ================================

const tools = {
  getUserProfile: createAuthenticatedTool(
    {
      name: 'getUserProfile',
      description: 'Get authenticated user profile information',
      inputSchema: {
        type: 'object',
        properties: {
          includeScopes: {
            type: 'boolean',
            description: 'Include user scopes in response',
            default: false,
          },
          format: {
            type: 'string',
            enum: ['simple', 'detailed'],
            description: 'Response format',
            default: 'simple',
          },
        },
        additionalProperties: false,
      },
      requiredScopes: ['user:profile'],
    },
    async ({ args, descope }) => {
      const baseProfile = {
        userId: descope.userId,
        projectId: descope.projectId,
        timestamp: new Date().toISOString(),
      };

      if (args.format === 'detailed') {
        return {
          ...baseProfile,
          scopes: args.includeScopes ? descope.userScopes : undefined,
          tokenInfo: {
            hasOutboundAccess: typeof descope.getOutboundToken === 'function',
          },
        };
      }

      return baseProfile;
    },
  ),

  listUserScopes: createAuthenticatedTool(
    {
      name: 'listUserScopes',
      description: 'List all scopes granted to the authenticated user',
      requiredScopes: ['user:profile'],
    },
    async ({ descope }) => {
      return {
        userId: descope.userId,
        scopes: descope.userScopes,
        scopeCount: descope.userScopes.length,
      };
    },
  ),
};

export async function mcpToolHandler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { tool } = req.query;
    const toolName = Array.isArray(tool) ? tool[0] : tool;

    if (!toolName || !(toolName in tools)) {
      return res.status(404).json({
        error: 'Tool not found',
        availableTools: Object.keys(tools),
      });
    }

    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      const wwwAuth = buildWWWAuthenticate({
        error: 'invalid_request',
        error_description: 'Authorization header required',
      });

      res.setHeader('WWW-Authenticate', wwwAuth);
      return res.status(401).json({
        error: 'invalid_request',
        error_description: 'Authorization header required',
      });
    }

    const mockExtra = {
      signal: new AbortController().signal,
      authInfo: { token },
      descope: undefined as any,
    };

    const selectedTool = tools[toolName as keyof typeof tools];
    const result = await selectedTool.handler(req.body || {}, mockExtra);

    return res.status(200).json(result);
  } catch (error: any) {
    if (error.code && error.oauthError) {
      res.setHeader('WWW-Authenticate', error.wwwAuthenticate);
      return res.status(error.code).json(error.oauthError);
    }

    console.error('Tool execution error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
}

// ================================
// 4. Higher-Order Component for Route Protection
// File: lib/withAuth.ts
// ================================

export function withAuth(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>,
  requiredScopes: string[] = [],
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.replace('Bearer ', '');

      if (!token) {
        const wwwAuth = buildWWWAuthenticate({
          error: 'invalid_request',
          error_description: 'Authorization header required',
        });

        res.setHeader('WWW-Authenticate', wwwAuth);
        return res.status(401).json({
          error: 'invalid_request',
          error_description: 'Authorization header required',
        });
      }

      if (requiredScopes.length > 0) {
        const authMiddleware = await createMcpAuthMiddleware({
          requiredScopes,
        });

        const mockRequest = { method: req.method };
        const mockExtra = {
          signal: new AbortController().signal,
          authInfo: { token },
          descope: undefined as any,
        };

        await authMiddleware(mockRequest, mockExtra, async () => {
          (req as any).descope = mockExtra.descope;
        });
      }

      return handler(req, res);
    } catch (error: any) {
      if (error.code && error.oauthError) {
        res.setHeader('WWW-Authenticate', error.wwwAuthenticate);
        return res.status(error.code).json(error.oauthError);
      }

      const wwwAuth = buildWWWAuthenticate({
        error: 'invalid_token',
        error_description: 'Token validation failed',
      });

      res.setHeader('WWW-Authenticate', wwwAuth);
      return res.status(401).json({
        error: 'invalid_token',
        error_description: 'Token validation failed',
      });
    }
  };
}

// ================================
// 5. Example Usage of Higher-Order Component
// ================================

export const protectedRoute = withAuth(
  async (req: NextApiRequest, res: NextApiResponse) => {
    const descope = (req as any).descope;

    res.json({
      message: 'This is a protected route',
      user: {
        id: descope.userId,
        projectId: descope.projectId,
        scopes: descope.userScopes,
      },
    });
  },
  ['mcp:read'],
);

// Example usage in actual API route files:
/*
// pages/.well-known/oauth-protected-resource.ts
export default metadataHandler;

// pages/api/protected.ts  
export default protectedApiHandler;

// pages/api/mcp-tools/[tool].ts
export default mcpToolHandler;

// pages/api/secure-example.ts
export default withAuth(async (req, res) => {
  res.json({ message: 'Secure endpoint accessed successfully' });
}, ['mcp:read']);
*/

// Export handlers for use in other files
export default {
  metadataHandler,
  protectedMetadataHandler,
  protectedApiHandler,
  mcpToolHandler,
  withAuth,
  protectedRoute,
};
