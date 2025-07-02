# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-01-XX

### Added
- Initial release of @descope/mcp-sdk
- `createAuthenticatedTool` function for building authenticated MCP tools with automatic scope validation
- `createMcpAuthMiddleware` for authentication middleware with OAuth 2.0 compliance
- `getOutboundToken` for accessing external provider tokens (GitHub, Google, Slack, etc.)
- OAuth 2.0 Protected Resource Metadata (RFC 9728) support with `buildResourceMetadata`
- `buildWWWAuthenticate` for compliant OAuth error responses
- Type-safe tool builder with JSON Schema validation
- Comprehensive framework examples (Express.js, Next.js App Router, Next.js Pages Router)
- Full TypeScript support with type definitions
- Comprehensive test suite with unit and integration tests
- Documentation and API reference

### Features
- ✅ Authenticated MCP tools with built-in scope checking
- ✅ Outbound token access via Descope for external providers
- ✅ Automatic OAuth 2.0 scope validation with compliant error responses
- ✅ Protected Resource Metadata (RFC 9728) endpoints
- ✅ JWT validation with signature verification
- ✅ WWW-Authenticate header generation for OAuth compliance
- ✅ Token caching and performance optimization
- ✅ Environment variable configuration
- ✅ Framework integration examples
