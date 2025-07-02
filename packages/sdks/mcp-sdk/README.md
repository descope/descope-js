# @descope/mcp-sdk

Secure Model Context Protocol (MCP) SDK for Node.js with Descope authentication. Build MCP servers with enterprise-grade authentication, scope-based access control, and OAuth 2.0 compliance.

## Prerequisites

Before using this SDK, you need:

1. **Descope Account**: Sign up at [https://app.descope.com](https://app.descope.com)
2. **Project ID**: Get your project ID from the Descope console
3. **Node.js**: Version 18 or higher
4. **MCP Knowledge**: Basic understanding of [Model Context Protocol](https://modelcontextprotocol.io)

### Environment Setup

Set the required environment variable:

```bash
export DESCOPE_PROJECT_ID=P2abc123def456ghi789  # Your actual project ID
export DESCOPE_BASE_URL=https://api.descope.com # Optional: defaults to production
```

## Why Use This SDK?

### 🎯 **1. Automatic Scope Validation Out-of-the-Box**

Define required scopes in your middleware or tools, and get automatic OAuth 2.0 compliant validation with proper `WWW-Authenticate` headers when scopes are missing.

```typescript
// Middleware automatically validates required scopes
const authMiddleware = await createMcpAuthMiddleware({
  requiredScopes: ['mcp:access', 'user:read'], // Missing scopes = automatic 403 with proper headers
});

// Tools get scope validation automatically
const tool = createAuthenticatedTool({
  requiredScopes: ['user:write'], // Validated before tool execution
  // ...
});
```

### 🔗 **2. Access Tokens from Other Providers via Descope Outbound Apps**

Seamlessly get tokens for external services (Google, GitHub, Slack, etc.) through Descope's outbound application feature.

```typescript
const tool = createAuthenticatedTool(
  {
    name: 'syncWithGitHub',
    requiredScopes: ['github:read'],
  },
  async ({ descope }) => {
    // Get GitHub token for the authenticated user via Descope
    const githubToken = await descope.getOutboundToken('github-app');

    // Use GitHub token to call GitHub API
    const response = await fetch('https://api.github.com/user/repos', {
      headers: { Authorization: `Bearer ${githubToken}` },
    });
  },
);
```

### 📝 **3. Easy Protected Resource Metadata APIs**

Serve RFC 9728 compliant OAuth 2.0 Protected Resource Metadata endpoints with minimal setup across popular frameworks.

#### Express.js

```typescript
import express from 'express';
import { buildResourceMetadata, createMcpAuthMiddleware } from '@descope/mcp-sdk';

const app = express();

// Serve OAuth metadata endpoint
app.get('/.well-known/oauth-protected-resource', (req, res) => {
  const metadata = buildResourceMetadata({
    resource: 'https://api.example.com',
    authorizationServers: ['https://auth.descope.com/YOUR_PROJECT_ID'],
    scopes: ['mcp:read', 'mcp:write'],
  });
  res.json(metadata);
});

// Protected route with automatic scope validation
app.get('/api/protected', async (req, res) => {
  const authMiddleware = await createMcpAuthMiddleware({
    requiredScopes: ['mcp:read'],
  });
  // Middleware handles token validation and scope checking automatically
});
```

#### Next.js (App Router)

```typescript
// app/.well-known/oauth-protected-resource/route.ts
import { buildResourceMetadata } from '@descope/mcp-sdk';

export async function GET() {
  const metadata = buildResourceMetadata({
    resource: 'https://api.example.com',
    authorizationServers: ['https://auth.descope.com/YOUR_PROJECT_ID'],
    scopes: ['mcp:read', 'mcp:write'],
  });

  return NextResponse.json(metadata, {
    headers: { 'Cache-Control': 'public, max-age=3600' },
  });
}
```

#### Next.js (Pages Router)

```typescript
// pages/.well-known/oauth-protected-resource.ts
import { buildResourceMetadata } from '@descope/mcp-sdk';

export default async function handler(req, res) {
  const metadata = buildResourceMetadata({
    resource: 'https://api.example.com',
    authorizationServers: ['https://auth.descope.com/YOUR_PROJECT_ID'],
    scopes: ['mcp:read', 'mcp:write'],
  });

  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.json(metadata);
}
```

> 💡 **See Complete Framework Examples**: Check `/examples/metadata/` for full implementations with authentication, error handling, and MCP tool integration.

## Installation

```bash
npm install @descope/mcp-sdk
```

## Quick Start

### 1. Setup Authentication Middleware with Scope Validation

```typescript
import { createMcpAuthMiddleware } from '@descope/mcp-sdk';

// Create middleware with automatic scope validation
const authMiddleware = await createMcpAuthMiddleware({
  requiredScopes: ['mcp:access'], // Automatically returns 403 + WWW-Authenticate if missing
});

// When user lacks 'mcp:access' scope, automatically returns:
// 403 Forbidden with header: WWW-Authenticate: Bearer, error="insufficient_scope", scope="mcp:access"
```

### 2. Build Tools with Multi-Provider Token Access

```typescript
import { createAuthenticatedTool } from '@descope/mcp-sdk';

const syncGitHubRepos = createAuthenticatedTool(
  {
    name: 'syncGitHubRepos',
    description: 'Sync user repositories from GitHub',
    requiredScopes: ['github:read'], // Scope validation happens automatically
  },
  async ({ descope }) => {
    // Get GitHub token via Descope outbound app - no complex OAuth flow needed!
    const githubToken = await descope.getOutboundToken('github-app');

    if (!githubToken) {
      return { error: 'GitHub access not configured for user' };
    }

    // Call GitHub API with the token
    const repos = await fetch('https://api.github.com/user/repos', {
      headers: { Authorization: `Bearer ${githubToken}` },
    }).then((r) => r.json());

    return { repositories: repos.map((r) => r.name) };
  },
);
```

### 3. Serve Protected Resource Metadata

For framework-specific implementations, see the [Easy Protected Resource Metadata APIs](#-3-easy-protected-resource-metadata-apis) section above or check the complete examples in `/examples/metadata/`:

- **Express.js**: `/examples/metadata/express-metadata.ts`
- **Next.js App Router**: `/examples/metadata/nextjs-app-router.ts`
- **Next.js Pages Router**: `/examples/metadata/nextjs-pages-router.ts`

Basic metadata generation:

```typescript
import { buildResourceMetadata } from '@descope/mcp-sdk';

const metadata = buildResourceMetadata({
  resource: 'https://api.example.com',
  authorizationServers: ['https://auth.descope.com/YOUR_PROJECT_ID'],
  scopes: ['mcp:read', 'mcp:write', 'github:read'],
});
```

## Automatic OAuth 2.0 Error Handling

When required scopes are missing, the SDK automatically returns proper OAuth 2.0 error responses:

```typescript
// When insufficient scopes
{
  "isError": true,
  "code": 403,
  "headers": {
    "WWW-Authenticate": "Bearer, error=\"insufficient_scope\", error_description=\"Missing required scopes: user:write\", scope=\"user:write\""
  },
  "content": [{
    "type": "text",
    "text": "{\"error\": \"insufficient_scope\", \"error_description\": \"Missing required scopes: user:write\"}"
  }]
}
```

## API Reference

### createAuthMiddleware(options)

Creates authentication middleware for MCP requests.

```typescript
interface AuthMiddlewareOptions {
  skipAuth?: boolean; // Skip authentication
  requiredScopes?: string[]; // Required scopes for all requests
  tokenManager?: TokenManager; // Custom token manager
}
```

### defineToolWithDescope(options, handler)

Creates an MCP tool with Descope authentication and context.

```typescript
interface ToolOptions {
  name: string; // Tool name
  description: string; // Tool description
  inputSchema?: any; // JSON schema for inputs
  requiredScopes?: string[]; // Required scopes for this tool
}

interface ToolExecutionContext {
  descope: DescopeContext; // Descope user context
  args: Record<string, unknown>; // Tool arguments
}
```

### DescopeContext

Injected context for authenticated requests:

```typescript
interface DescopeContext {
  projectId: string; // Descope project ID
  userId: string; // Authenticated user ID
  userScopes: string[]; // User's granted scopes
  descopeToken: string; // Original Descope token
  getOutboundToken: (
    // Get token for external services
    appId: string,
    scopes?: string[],
  ) => Promise<string | null>;
}
```

### OAuth Error Types

```typescript
interface OAuthError {
  error: 'invalid_token' | 'insufficient_scope' | 'invalid_request';
  error_description?: string;
  error_uri?: string;
  scope?: string;
}

interface McpOAuthError extends Error {
  code: number;
  oauthError: OAuthError;
  wwwAuthenticate: string;
}
```

## Protected Resource Metadata

The SDK also provides OAuth 2.0 Protected Resource Metadata (RFC 9728) support:

### Resource Metadata Configuration

```typescript
import { buildResourceMetadata, buildWWWAuthenticate } from '@descope/mcp-sdk';

const resourceConfig = {
  resource: 'https://api.example.com',
  authorizationServers: ['https://auth.descope.com/YOUR_PROJECT_ID'],
  scopes: ['mcp:read', 'mcp:write'],
  docsUrl: 'https://docs.example.com/mcp',
};

// Generate metadata for /.well-known/oauth-protected-resource
const metadata = buildResourceMetadata(resourceConfig);

// Generate WWW-Authenticate headers (with resource metadata URL for MCP compliance)
const authHeader = buildWWWAuthenticate({
  error: 'insufficient_scope',
  error_description: 'Missing required scopes: mcp:write',
  scope: 'mcp:write',
  resourceMetadataUrl: 'https://api.example.com/.well-known/oauth-protected-resource',
});
```

### Metadata Endpoint Response

```json
{
  "resource": "https://api.example.com",
  "authorization_servers": ["https://auth.descope.com/P123456789"],
  "scopes_supported": ["mcp:read", "mcp:write"],
  "bearer_methods_supported": ["header"],
  "resource_documentation": "https://docs.example.com/mcp"
}
```

## Utility Functions

The SDK provides utility functions for common operations:

```typescript
import { validateScopes } from '@descope/mcp-sdk';

// Validate scopes
const scopeCheck = validateScopes(['read', 'write'], userScopes);
console.log(scopeCheck.valid); // boolean
console.log(scopeCheck.missing); // string[] - missing scopes
```

## Custom Token Validation

Provide your own token validator:

```typescript
const customAuthMiddleware = await createMcpAuthMiddleware({
  validateToken: async (token: string) => {
    // Custom validation logic
    return {
      valid: true,
      userId: 'user123',
      scopes: ['read', 'write'],
    };
  },
});
```

## Framework Examples

Complete working examples are available in the `/examples/metadata/` directory:

| Framework                | File                     | Features                                           |
| ------------------------ | ------------------------ | -------------------------------------------------- |
| **Express.js**           | `express-metadata.ts`    | Middleware setup, protected routes, error handling |
| **Next.js App Router**   | `nextjs-app-router.ts`   | Route handlers, middleware, API routes             |
| **Next.js Pages Router** | `nextjs-pages-router.ts` | API routes, HOC patterns, dynamic tools            |

Each example includes:

- ✅ OAuth 2.0 Protected Resource Metadata endpoint (`/.well-known/oauth-protected-resource`)
- ✅ Protected API routes with automatic scope validation
- ✅ MCP tool integration with authentication
- ✅ Proper error handling with WWW-Authenticate headers
- ✅ TypeScript definitions and best practices

## Key Benefits Summary

✅ **No Manual Scope Checking** - Define `requiredScopes` once, get automatic validation  
✅ **Multi-Provider Token Access** - Get GitHub, Google, Slack tokens via Descope outbound apps  
✅ **OAuth 2.0 Compliance** - Proper WWW-Authenticate headers and error responses  
✅ **Protected Resource Metadata** - RFC 9728 compliant endpoints with minimal setup  
✅ **Enterprise Security** - Built on Descope's enterprise authentication platform  
✅ **Framework Support** - Complete examples for Express.js and Next.js (App Router & Pages Router)

## Environment Variables

```bash
DESCOPE_PROJECT_ID=P123456789              # Your Descope project ID (required)
DESCOPE_BASE_URL=https://auth.descope.com  # Optional: Custom Descope URL
```

## License

MIT License - see [LICENSE](https://github.com/descope/descope-js/blob/main/LICENSE)
