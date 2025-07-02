/**
 * Next.js App Router Protected Resource Metadata Example
 *
 * This example shows how to implement OAuth 2.0 Protected Resource Metadata (RFC 9728)
 * in Next.js 13+ using the App Router and the Descope MCP SDK.
 *
 * To use this example:
 * 1. Install Next.js: npm install next react react-dom @types/react @types/react-dom
 * 2. Create the appropriate route files in your Next.js app directory
 * 3. Set DESCOPE_PROJECT_ID environment variable
 *
 * File structure:
 * - app/.well-known/oauth-protected-resource/route.ts
 * - app/api/protected/route.ts
 * - app/api/mcp-tools/route.ts
 */

import {
  buildResourceMetadata,
  buildWWWAuthenticate,
  createMcpAuthMiddleware,
  createAuthenticatedTool,
} from '@descope/mcp-sdk';

// Type definitions for Next.js (when available)
interface NextRequest {
  headers: {
    get: (name: string) => string | null;
  };
  method: string;
  json: () => Promise<any>;
}

// Mock NextResponse for type safety
const createNextResponse = () => ({
  json: (
    data: any,
    options?: { headers?: Record<string, string>; status?: number },
  ) => ({
    data,
    ...options,
  }),
});

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
// File: app/.well-known/oauth-protected-resource/route.ts
// ================================

// Option A: Public metadata endpoint (common approach, similar to OpenID Connect)
export async function getMetadata() {
  try {
    const metadata = buildResourceMetadata(resourceConfig);

    const NextResponse = createNextResponse();
    return NextResponse.json(metadata, {
      headers: {
        'Cache-Control': 'public, max-age=3600',
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error generating resource metadata:', error);
    const NextResponse = createNextResponse();
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// Option B: Protected metadata endpoint (higher security)
export async function getProtectedMetadata(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      const NextResponse = createNextResponse();
      return NextResponse.json(
        {
          error: 'invalid_request',
          error_description: 'Authorization required to access metadata',
        },
        {
          status: 401,
          headers: {
            'WWW-Authenticate': buildWWWAuthenticate({
              error: 'invalid_request',
              error_description: 'Authorization required to access metadata',
              resourceMetadataUrl: `${API_BASE_URL}/.well-known/oauth-protected-resource`,
            }),
          },
        },
      );
    }

    // Validate token (basic validation, no specific scopes required for metadata)
    const authMiddleware = await createMcpAuthMiddleware({
      requiredScopes: [], // No specific scopes required for metadata
    });

    const mockRequest = { method: request.method };
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

    const NextResponse = createNextResponse();
    return NextResponse.json(metadata, {
      headers: {
        'Cache-Control': 'private, max-age=300',
        'Content-Type': 'application/json',
      },
    });
  } catch (error: any) {
    const NextResponse = createNextResponse();

    if (error.code && error.oauthError) {
      return NextResponse.json(error.oauthError, {
        status: error.code,
        headers: {
          'WWW-Authenticate': error.wwwAuthenticate,
        },
      });
    }

    return NextResponse.json(
      {
        error: 'invalid_token',
        error_description: 'Token validation failed',
      },
      {
        status: 401,
        headers: {
          'WWW-Authenticate': buildWWWAuthenticate({
            error: 'invalid_token',
            error_description: 'Token validation failed',
          }),
        },
      },
    );
  }
}

// ================================
// 2. Protected API Route with Scope Validation
// File: app/api/protected/route.ts
// ================================

export async function protectedRouteHandler(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      const NextResponse = createNextResponse();
      return NextResponse.json(
        {
          error: 'invalid_request',
          error_description: 'Authorization header required',
        },
        {
          status: 401,
          headers: {
            'WWW-Authenticate': buildWWWAuthenticate({
              error: 'invalid_request',
              error_description: 'Authorization header required',
            }),
          },
        },
      );
    }

    const authMiddleware = await createMcpAuthMiddleware({
      requiredScopes: ['mcp:read'],
    });

    const mockRequest = { method: request.method };
    const mockExtra = {
      signal: new AbortController().signal,
      authInfo: { token },
      descope: undefined as any,
    };

    await authMiddleware(mockRequest, mockExtra, async () => {
      // Middleware passed - user is authenticated with required scopes
    });

    const NextResponse = createNextResponse();
    return NextResponse.json({
      message: 'Access granted to protected resource',
      userId: mockExtra.descope?.userId,
      projectId: mockExtra.descope?.projectId,
      scopes: mockExtra.descope?.userScopes,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    const NextResponse = createNextResponse();

    if (error.code && error.oauthError) {
      return NextResponse.json(error.oauthError, {
        status: error.code,
        headers: {
          'WWW-Authenticate': error.wwwAuthenticate,
        },
      });
    }

    return NextResponse.json(
      {
        error: 'invalid_token',
        error_description: 'Token validation failed',
      },
      {
        status: 401,
        headers: {
          'WWW-Authenticate': buildWWWAuthenticate({
            error: 'invalid_token',
            error_description: 'Token validation failed',
          }),
        },
      },
    );
  }
}

// ================================
// 3. MCP Tools API Route
// File: app/api/mcp-tools/route.ts
// ================================

const userProfileTool = createAuthenticatedTool(
  {
    name: 'getUserProfile',
    description: 'Get authenticated user profile information',
    inputSchema: {
      type: 'object',
      properties: {
        includeScopes: {
          type: 'boolean',
          description: 'Include user scopes in response',
        },
      },
      additionalProperties: false,
    },
    requiredScopes: ['user:profile'],
  },
  async ({ args, descope }) => {
    const profile = {
      userId: descope.userId,
      projectId: descope.projectId,
      timestamp: new Date().toISOString(),
    };

    if (args.includeScopes) {
      (profile as any).scopes = descope.userScopes;
    }

    return profile;
  },
);

export async function mcpToolsHandler(request: NextRequest) {
  try {
    const body = await request.json();
    const { toolName, args } = body;

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      const NextResponse = createNextResponse();
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    const mockExtra = {
      signal: new AbortController().signal,
      authInfo: { token },
      descope: undefined as any,
    };

    let result: any;
    switch (toolName) {
      case 'getUserProfile':
        result = await userProfileTool.handler(args || {}, mockExtra);
        break;

      default:
        const NextResponse = createNextResponse();
        return NextResponse.json({ error: 'Unknown tool' }, { status: 404 });
    }

    const NextResponse = createNextResponse();
    return NextResponse.json(result);
  } catch (error: any) {
    const NextResponse = createNextResponse();

    if (error.code && error.oauthError) {
      return NextResponse.json(error.oauthError, {
        status: error.code,
        headers: {
          'WWW-Authenticate': error.wwwAuthenticate,
        },
      });
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// ================================
// 4. Middleware for Global Auth (Optional)
// File: middleware.ts (in project root)
// ================================

export function createNextJsMiddleware() {
  return async function middleware(request: NextRequest) {
    // Only apply to protected routes
    if (request.headers.get('pathname')?.startsWith('/api/protected')) {
      const authHeader = request.headers.get('authorization');

      if (!authHeader) {
        const NextResponse = createNextResponse();
        return NextResponse.json(
          {
            error: 'invalid_request',
            error_description: 'Authorization header required',
          },
          {
            status: 401,
            headers: {
              'WWW-Authenticate': buildWWWAuthenticate({
                error: 'invalid_request',
                error_description: 'Authorization header required',
              }),
            },
          },
        );
      }
    }

    return { next: true };
  };
}

// Example usage in route files:
/*
// app/.well-known/oauth-protected-resource/route.ts
export { getMetadata as GET };

// app/api/protected/route.ts  
export { protectedRouteHandler as GET, protectedRouteHandler as POST };

// app/api/mcp-tools/route.ts
export { mcpToolsHandler as POST };
*/

// Export all handlers for use in actual Next.js route files
export default {
  getMetadata,
  getProtectedMetadata,
  protectedRouteHandler,
  mcpToolsHandler,
  createNextJsMiddleware,
};
