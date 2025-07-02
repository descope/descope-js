/**
 * Express.js Protected Resource Metadata Example
 *
 * This example shows how to implement OAuth 2.0 Protected Resource Metadata (RFC 9728)
 * endpoints in an Express.js application using the Descope MCP SDK.
 *
 * To use this example:
 * 1. Install dependencies: npm install express @types/express
 * 2. Uncomment the import statement and function call at the bottom
 * 3. Set DESCOPE_PROJECT_ID environment variable
 */

import {
  buildResourceMetadata,
  buildWWWAuthenticate,
  createMcpAuthMiddleware,
} from '@descope/mcp-sdk';

// Type definitions for Express (when available)
interface ExpressApp {
  get: (path: string, handler: (req: any, res: any) => void) => void;
  use: (handler: (err: any, req: any, res: any, next: any) => void) => void;
  listen: (port: number, callback: () => void) => void;
}

interface ExpressRequest {
  method: string;
  headers: {
    authorization?: string;
  };
}

interface ExpressResponse {
  json: (data: any) => void;
  status: (code: number) => ExpressResponse;
  set: (header: string, value: string) => ExpressResponse;
}

// Configuration
const DESCOPE_PROJECT_ID = process.env.DESCOPE_PROJECT_ID!;
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

// Resource configuration for MCP compliance
const resourceConfig = {
  resource: API_BASE_URL,
  authorizationServers: [`https://auth.descope.com/${DESCOPE_PROJECT_ID}`],
  scopes: ['mcp:read', 'mcp:write', 'user:profile', 'admin:manage'],
  docsUrl: `${API_BASE_URL}/docs`,
};

// ================================
// Standalone Handler Functions (for use as middleware or in custom setups)
// ================================

// Option A: Public metadata endpoint handler
export async function getMetadata(req: ExpressRequest, res: ExpressResponse) {
  try {
    const metadata = buildResourceMetadata(resourceConfig);

    res
      .set('Cache-Control', 'public, max-age=3600')
      .set('Content-Type', 'application/json')
      .json(metadata);
  } catch (error) {
    console.error('Error generating resource metadata:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Option B: Protected metadata endpoint handler
export async function getProtectedMetadata(
  req: ExpressRequest,
  res: ExpressResponse,
) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return res
        .status(401)
        .set(
          'WWW-Authenticate',
          buildWWWAuthenticate({
            error: 'invalid_request',
            error_description: 'Authorization required to access metadata',
            resourceMetadataUrl: `${API_BASE_URL}/.well-known/oauth-protected-resource`,
          }),
        )
        .json({
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

    const metadata = buildResourceMetadata(resourceConfig);

    res
      .set('Cache-Control', 'private, max-age=300')
      .set('Content-Type', 'application/json')
      .json(metadata);
  } catch (error: any) {
    if (error.code && error.oauthError) {
      return res
        .status(error.code)
        .set('WWW-Authenticate', error.wwwAuthenticate)
        .json(error.oauthError);
    }

    return res
      .status(401)
      .set(
        'WWW-Authenticate',
        buildWWWAuthenticate({
          error: 'invalid_token',
          error_description: 'Token validation failed',
          resourceMetadataUrl: `${API_BASE_URL}/.well-known/oauth-protected-resource`,
        }),
      )
      .json({
        error: 'invalid_token',
        error_description: 'Token validation failed',
      });
  }
}

export function createExpressApp(express: any): ExpressApp {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000');

  // 1. OAuth 2.0 Protected Resource Metadata Endpoints

  // Option A: Public metadata endpoint (common approach, similar to OpenID Connect)
  app.get('/.well-known/oauth-protected-resource', getMetadata);

  // Option B: Protected metadata endpoint (higher security)
  app.get('/.well-known/oauth-protected-resource-auth', getProtectedMetadata);

  // 2. Protected API endpoint with automatic scope validation
  app.get(
    '/api/protected',
    async (req: ExpressRequest, res: ExpressResponse) => {
      try {
        const authMiddleware = await createMcpAuthMiddleware({
          requiredScopes: ['mcp:read'],
        });

        const mockRequest = { method: 'GET' };
        const mockExtra = {
          signal: new AbortController().signal,
          authInfo: {
            token: req.headers.authorization?.replace('Bearer ', ''),
          },
          descope: undefined as any,
        };

        await authMiddleware(mockRequest, mockExtra, async () => {
          res.json({
            message: 'Access granted',
            userId: mockExtra.descope?.userId,
            scopes: mockExtra.descope?.userScopes,
          });
        });
      } catch (error: any) {
        if (error.code && error.oauthError) {
          res
            .status(error.code)
            .set('WWW-Authenticate', error.wwwAuthenticate)
            .json(error.oauthError);
        } else {
          res
            .status(401)
            .set(
              'WWW-Authenticate',
              buildWWWAuthenticate({
                error: 'invalid_request',
                error_description: 'Authentication required',
                resourceMetadataUrl: `${API_BASE_URL}/.well-known/oauth-protected-resource`,
              }),
            )
            .json({ error: 'Authentication required' });
        }
      }
    },
  );

  // 3. Error handling middleware for OAuth errors
  app.use((err: any, req: ExpressRequest, res: ExpressResponse, next: any) => {
    if (err.oauthError) {
      res
        .status(err.code || 401)
        .set('WWW-Authenticate', err.wwwAuthenticate)
        .json(err.oauthError);
    } else {
      console.error('Unhandled error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // 4. Start server function
  const startServer = () => {
    app.listen(PORT, () => {
      console.log(`🚀 Express server running on http://localhost:${PORT}`);
      console.log(
        `📋 Public metadata endpoint: http://localhost:${PORT}/.well-known/oauth-protected-resource`,
      );
      console.log(
        `🔐 Protected metadata endpoint: http://localhost:${PORT}/.well-known/oauth-protected-resource-auth`,
      );
      console.log(
        `🔒 Protected API endpoint: http://localhost:${PORT}/api/protected`,
      );
      console.log(`📖 Example usage:`);
      console.log(
        `   curl http://localhost:${PORT}/.well-known/oauth-protected-resource`,
      );
      console.log(
        `   curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:${PORT}/.well-known/oauth-protected-resource-auth`,
      );
      console.log(
        `   curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:${PORT}/api/protected`,
      );
    });
  };

  return {
    ...app,
    startServer,
  } as ExpressApp & { startServer: () => void };
}

// Example usage (uncomment when express is installed):
/*
import express from 'express';

const app = createExpressApp(express);
app.startServer();
*/

// Example usage of individual handlers in custom Express setup:
/*
import express from 'express';
import { getMetadata, getProtectedMetadata } from './express-metadata';

const app = express();

// Use the handlers directly in your routes
app.get('/.well-known/oauth-protected-resource', getMetadata);
app.get('/.well-known/oauth-protected-resource-auth', getProtectedMetadata);

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
*/

// Export handlers for use in other Express applications
export default {
  createExpressApp,
  getMetadata,
  getProtectedMetadata,
};
