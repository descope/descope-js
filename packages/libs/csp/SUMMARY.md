# @descope/csp - Package Summary

## What We Built

A TypeScript-first, zero-dependency Content Security Policy (CSP) builder for Descope integrations.

### Package Structure

```
packages/libs/csp/
├── src/
│   ├── types.ts          # TypeScript type definitions
│   ├── nonce.ts          # Cryptographically secure nonce generation
│   ├── defaults.ts       # Descope default CSP directives
│   ├── merge.ts          # CSP policy merging logic
│   ├── serialize.ts      # Convert directives to CSP header string
│   ├── builder.ts        # Main createDescopeCSP function
│   ├── presets.ts        # Common third-party presets (Google Fonts, Segment)
│   └── index.ts          # Public API exports
├── examples/
│   ├── basic-usage.ts    # Core API examples
│   └── nextjs-middleware.ts  # Next.js integration example
├── package.json
├── tsconfig.json
├── rollup.config.mjs
└── README.md
```

## Core Features

### 1. Simple API

```typescript
import { createDescopeCSP, generateNonce } from '@descope/csp';

const nonce = generateNonce();
const csp = createDescopeCSP({ nonce });

console.log(csp.toString());
console.log(csp.directives);
```

### 2. Environment-Specific URLs

```typescript
const csp = createDescopeCSP({
  urls: {
    api: process.env.DESCOPE_API_URL || 'api.descope.com',
    cdn: process.env.DESCOPE_CDN_URL || 'descopecdn.com',
    static: process.env.DESCOPE_STATIC_URL || 'static.descope.com',
    images: process.env.DESCOPE_IMAGES_URL || 'imgs.descope.com',
  },
});
```

### 3. Additive Customization

```typescript
const csp = createDescopeCSP({
  extend: {
    'connect-src': ['https://api.myapp.com'],
    'img-src': ['https://images.myapp.com'],
  },
});
```

### 4. Presets

```typescript
import { presets } from '@descope/csp';

const csp = createDescopeCSP({
  presets: [presets.googleFonts, presets.segment],
});
```

## Descope Default CSP

Based on web-component requirements:

- **script-src**: `'self'`, Descope CDN, static assets
- **style-src**: `'self'`, Descope static
- **img-src**: `'self'`, Descope images, static, `data:`
- **font-src**: `'self'`, Descope CDN
- **connect-src**: `'self'`, Descope API, static
- **Other directives**: Safe defaults

All URLs can be customized via the `urls` option.

## Build Status

✅ TypeScript compilation successful
✅ Rollup build successful (ESM + CJS)
✅ Type declarations generated
✅ Runtime tests passed

## Next Steps

1. **Add to NX workspace** - Register package in nx.json
2. **Write unit tests** - Jest tests for all modules
3. **Publish to npm** - Configure publishing workflow
4. **Update docs** - Add to main descope-js README
5. **Integration examples** - More framework examples (Express, Fastify, etc.)
6. **Validation** - Optional CSP validation/warnings

## Usage in Other Packages

This package can be imported by:

- `@descope/web-component` - CSP generation for standalone usage
- `@descope/nextjs-sdk` - Middleware helpers
- `@descope/react-sdk` - CSP context providers
- Any customer application - Direct usage

## Customer Use Case

Customers deploying Descope flows to multiple environments (dev/staging/prod) can use this package to:

1. **Generate secure CSP** with Descope defaults
2. **Customize API URLs** per environment
3. **Add custom rules** for their own services
4. **Get nonce support** for inline scripts/styles
5. **Use presets** for common third-party integrations

## File Sizes

- Core package (minified): ~2KB
- Zero runtime dependencies
- Tree-shakeable ES modules
