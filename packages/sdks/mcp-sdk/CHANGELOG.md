# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-01-XX

### Added
- Initial release of @descope/mcp-sdk
- Core TokenManager for JWT validation and outbound token management
- defineToolWithDescope function for creating authenticated MCP tools
- Automatic scope validation and authorization
- Type-safe tool builder with Zod schema validation
- Authentication middleware for custom MCP servers
- Token caching for improved performance
- Comprehensive test suite with unit and integration tests
- Examples for basic tools and multi-provider integration
- Full TypeScript support with generic types
- Documentation and API reference

### Features
- ✅ JWT validation with signature verification
- ✅ Scope-based authorization system
- ✅ Outbound token fetching for third-party APIs
- ✅ Request/response type safety with Zod
- ✅ Error handling with standardized MCP error responses
- ✅ Token caching and performance optimization
- ✅ Environment variable configuration
- ✅ Middleware support for custom authentication flows
