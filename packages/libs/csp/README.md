# @descope/csp

Content Security Policy (CSP) builder for Descope integrations. Helps you create secure CSP policies for applications using Descope authentication flows and components.

## Installation

```bash
npm install @descope/csp
```

## Quick Start

```typescript
import { createDescopeCSP, generateNonce } from '@descope/csp';

const nonce = generateNonce();
const csp = createDescopeCSP({ nonce });

console.log(csp.toString());
```

## Core Concepts

This package provides a simple, type-safe way to build CSP policies that work with Descope. It:

- **Provides secure defaults** for Descope flows and components
- **Allows environment-specific URLs** (staging, production, self-hosted)
- **Supports nonce generation** for inline scripts and styles
- **Merges custom rules** additively with Descope defaults
- **Includes common presets** (Google Fonts, analytics, etc.)

## API Reference

### `createDescopeCSP(options?)`

Creates a CSP policy with Descope defaults.

```typescript
import { createDescopeCSP } from '@descope/csp';

const csp = createDescopeCSP({
  urls: {
    api: 'api.descope.com',
    cdn: 'descopecdn.com',
    static: 'static.descope.com',
    images: 'imgs.descope.com',
  },
  nonce: 'random-nonce-value',
  extend: {
    'connect-src': ['https://api.myapp.com'],
  },
  presets: [presets.googleFonts],
});

csp.toString();
csp.directives;
```

**Options:**

- `urls` - Custom Descope URLs (for staging/preview environments)
- `nonce` - Cryptographically secure nonce for inline scripts/styles
- `extend` - Additional CSP directives (merged additively)
- `presets` - Array of preset policies to include

**Returns:** `CSPResult` with:

- `directives` - CSP directives as an object
- `toString()` - CSP policy as a header string

### `generateNonce(options?)`

Generates a cryptographically secure nonce.

```typescript
import { generateNonce } from '@descope/csp';

const nonce = generateNonce();
const hexNonce = generateNonce({ encoding: 'hex', length: 16 });
```

**Options:**

- `length` - Byte length (default: 32)
- `encoding` - 'base64' | 'hex' (default: 'base64')

### `presets`

Common third-party CSP configurations.

```typescript
import { presets } from '@descope/csp';

presets.googleFonts; // Google Fonts (fonts.googleapis.com, fonts.gstatic.com)
presets.segment; // Segment analytics
presets.featureOS; // Feature OS widgets
presets.devRev; // DevRev platform
presets.jsdelivr; // jsDelivr CDN
presets.npmRegistry; // NPM registry (@descope/flow-components)
presets.descopeInternal; // Descope internal tools (dev-panel, static assets)
```

**Available Presets:**

| Preset            | Description              | Directives Added                                                |
| ----------------- | ------------------------ | --------------------------------------------------------------- |
| `googleFonts`     | Google Fonts integration | `style-src`, `font-src`                                         |
| `segment`         | Segment analytics        | `script-src`, `connect-src`                                     |
| `featureOS`       | Feature OS widgets       | `script-src`, `frame-src`                                       |
| `devRev`          | DevRev platform          | `script-src`, `connect-src`, `frame-src`                        |
| `jsdelivr`        | jsDelivr CDN fallback    | `script-src`, `connect-src`                                     |
| `npmRegistry`     | NPM registry access      | `connect-src`                                                   |
| `descopeInternal` | Descope internal tools   | `script-src`, `style-src`, `img-src`, `font-src`, `connect-src` |

## Usage Examples

### Minimal Setup

```typescript
import { createDescopeCSP } from '@descope/csp';

const csp = createDescopeCSP();
console.log(csp.toString());
```

### With Custom Descope URLs

```typescript
import { createDescopeCSP } from '@descope/csp';

const csp = createDescopeCSP({
  urls: {
    api: process.env.DESCOPE_API_URL || 'api.descope.com',
    cdn: process.env.DESCOPE_CDN_URL || 'descopecdn.com',
    static: process.env.DESCOPE_STATIC_URL || 'static.descope.com',
    images: process.env.DESCOPE_IMAGES_URL || 'imgs.descope.com',
  },
});
```

### With Nonce

```typescript
import { createDescopeCSP, generateNonce } from '@descope/csp';

const nonce = generateNonce();

const csp = createDescopeCSP({ nonce });

console.log(csp.toString());
```

### With Custom Rules

```typescript
import { createDescopeCSP } from '@descope/csp';

const csp = createDescopeCSP({
  extend: {
    'connect-src': ['https://api.myapp.com', 'wss://realtime.myapp.com'],
    'img-src': ['https://images.myapp.com'],
    'frame-src': ['https://embedded.myapp.com'],
  },
});
```

### With Presets

```typescript
import { createDescopeCSP, presets } from '@descope/csp';

const csp = createDescopeCSP({
  presets: [presets.googleFonts, presets.segment],
});
```

### Complete Example

```typescript
import { createDescopeCSP, generateNonce, presets } from '@descope/csp';

const nonce = generateNonce();

const csp = createDescopeCSP({
  urls: {
    api: process.env.DESCOPE_API_URL || 'api.descope.com',
    cdn: process.env.DESCOPE_CDN_URL || 'descopecdn.com',
    static: process.env.DESCOPE_STATIC_URL || 'static.descope.com',
    images: process.env.DESCOPE_IMAGES_URL || 'imgs.descope.com',
  },
  nonce,
  extend: {
    'connect-src': ['https://api.myapp.com'],
    'img-src': ['https://images.myapp.com'],
  },
  presets: [presets.googleFonts],
});

console.log(csp.toString());
```

### Console-App Integration

For applications like console-app that need all integrations:

```typescript
import { createDescopeCSP, generateNonce, presets } from '@descope/csp';

const nonce = generateNonce();

const csp = createDescopeCSP({
  nonce,
  presets: [presets.googleFonts, presets.segment, presets.featureOS, presets.devRev, presets.jsdelivr, presets.npmRegistry, presets.descopeInternal],
  extend: {
    'connect-src': ['https://*.descope.org'], // Vercel preview
  },
});
```

## Framework Integration Examples

### Next.js Middleware

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createDescopeCSP, generateNonce } from '@descope/csp';

export function middleware(request: NextRequest) {
  const nonce = generateNonce();

  const csp = createDescopeCSP({
    urls: {
      api: process.env.DESCOPE_API_URL,
      cdn: process.env.DESCOPE_CDN_URL,
    },
    nonce,
  });

  const response = NextResponse.next();
  response.headers.set('Content-Security-Policy', csp.toString());
  response.headers.set('x-nonce', nonce);

  return response;
}
```

### Express

```typescript
import express from 'express';
import { createDescopeCSP, generateNonce } from '@descope/csp';

const app = express();

app.use((req, res, next) => {
  const nonce = generateNonce();

  const csp = createDescopeCSP({ nonce });

  res.setHeader('Content-Security-Policy', csp.toString());
  res.locals.nonce = nonce;

  next();
});
```

### Vercel Edge Function

```typescript
import { createDescopeCSP, generateNonce } from '@descope/csp';

export default async function handler(request: Request) {
  const nonce = generateNonce();

  const csp = createDescopeCSP({
    urls: {
      api: process.env.DESCOPE_API_URL,
    },
    nonce,
  });

  return new Response('Hello', {
    headers: {
      'Content-Security-Policy': csp.toString(),
      'x-nonce': nonce,
    },
  });
}
```

## What's Included in Descope Defaults?

The base Descope policy includes:

- **script-src**: Descope CDN for flow components
- **style-src**: Descope static assets
- **img-src**: Descope images and static content
- **font-src**: Descope CDN for fonts
- **connect-src**: Descope API endpoints
- **Other directives**: Safe defaults (`'self'`, `'none'` for objects, etc.)

All using `'self'` as the base, with specific Descope domains added.

## Environment-Specific Configuration

### Using Environment Variables

```typescript
const csp = createDescopeCSP({
  urls: {
    api: process.env.DESCOPE_API_URL ?? 'api.descope.com',
    cdn: process.env.DESCOPE_CDN_URL ?? 'descopecdn.com',
    static: process.env.DESCOPE_STATIC_URL ?? 'static.descope.com',
    images: process.env.DESCOPE_IMAGES_URL ?? 'imgs.descope.com',
  },
});
```

### Custom Environment Helper

```typescript
const getDescopeUrls = (env: string) => {
  if (env === 'staging') {
    return {
      api: 'api.staging.descope.com',
      cdn: 'cdn.staging.descope.com',
      static: 'static.staging.descope.com',
      images: 'imgs.staging.descope.com',
    };
  }

  return {
    api: 'api.descope.com',
    cdn: 'descopecdn.com',
    static: 'static.descope.com',
    images: 'imgs.descope.com',
  };
};

const csp = createDescopeCSP({
  urls: getDescopeUrls(process.env.NODE_ENV),
});
```

## Programmatic Access

Access directives as an object for framework-specific needs:

```typescript
import { createDescopeCSP } from '@descope/csp';

const csp = createDescopeCSP();

const directives = csp.directives;

console.log(directives['script-src']);
console.log(directives['connect-src']);
```

## TypeScript Support

Full TypeScript definitions included:

```typescript
import type { CSPDirectives, CSPDirectiveName, DescopeCSPOptions, CSPResult } from '@descope/csp';
```

## Security Best Practices

1. **Always use nonces** - Avoid `'unsafe-inline'` by generating nonces
2. **Regenerate nonces per request** - Never reuse nonces
3. **Use HTTPS** - All custom URLs should use HTTPS
4. **Test in report-only mode** - Before enforcing, test with `Content-Security-Policy-Report-Only`
5. **Monitor violations** - Set up CSP violation reporting

## License

MIT

## Support

For issues or questions:

- GitHub: https://github.com/descope/descope-js/issues
- Email: help@descope.com
