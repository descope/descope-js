# SRI (Subresource Integrity) Implementation

## Overview

This document describes the implementation of Subresource Integrity (SRI) support for the web-component-ui loader in descope-js.

## What is SRI?

Subresource Integrity (SRI) is a security feature that enables browsers to verify that resources they fetch (for example, from a CDN) are delivered without unexpected manipulation. It works by allowing you to provide a cryptographic hash that a fetched resource must match.

## Implementation Details

### Backend (orchestrationservice)

The backend implementation (PR #5339) includes:

1. **SRI Hash Generation**: Automatically generates SHA-384 hash from the CDN-hosted web-component-ui loader
2. **Storage**: Stores hash in cache alongside component version
3. **Config Publishing**: Includes hash in `config.json` as `componentsVersionSRI`

### Frontend (descope-js)

The client-side implementation includes:

#### 1. Type Definitions

**File**: `packages/libs/sdk-mixins/src/mixins/configMixin/types.ts`

Added optional `componentsVersionSRI` field to `ProjectConfiguration`:

```typescript
export type ProjectConfiguration = {
  componentsVersion: string;
  componentsVersionSRI?: string; // NEW
  // ... other fields
};
```

#### 2. Script Injection Helpers

**File**: `packages/libs/sdk-mixins/src/mixins/injectNpmLibMixin/helpers.ts`

Updated to support integrity attribute:

- Modified `setupScript()` to accept optional `integrity` parameter
- Added automatic `crossOrigin = "anonymous"` when integrity is provided
- Updated `ScriptData` type to include optional `integrity` field
- Modified `injectScript()` to pass integrity to `setupScript()`
- Updated `generateLibUrls()` to include integrity in all generated URLs

#### 3. NPM Library Injection Mixin

**File**: `packages/libs/sdk-mixins/src/mixins/injectNpmLibMixin/injectNpmLibMixin.ts`

Updated `injectNpmLib` method to:

- Accept optional `integrity` parameter
- Pass integrity through to `generateLibUrls()`
- Log when SRI is being used

#### 4. Descope UI Mixin

**File**: `packages/libs/sdk-mixins/src/mixins/descopeUiMixin/descopeUiMixin.ts`

Added SRI support:

- New `#getComponentsVersionSRI()` method to retrieve hash from config
- Updated `#getDescopeUi()` to fetch and pass SRI hash to `injectNpmLib()`
- Added debug logging for SRI availability

### Testing

Created comprehensive test suites:

#### Web Component Tests

**File**: `packages/sdks/web-component/test/descope-wc.sri.test.ts`

Tests cover:

- Loading components without SRI (backward compatibility)
- Loading components with SRI hash
- Verifying integrity and crossOrigin attributes
- Different hash algorithms (SHA-256, SHA-384, SHA-512)
- Graceful handling of missing SRI
- SRI application to all CDN fallbacks

#### Helper Function Tests

**File**: `packages/libs/sdk-mixins/test/injectNpmLibMixin.sri.test.ts`

Tests cover:

- Integrity inclusion in generated script data
- Optional integrity handling
- Multiple CDN URLs with same integrity
- ScriptData type validation

### Documentation

**File**: `packages/sdks/web-component/README.md`

Added comprehensive security section covering:

- How SRI works
- Automatic SRI application
- Example generated script tags
- CSP compatibility
- Backward compatibility

## Usage

No code changes required for developers! SRI is automatically applied when available.

### Generated HTML

When SRI hash is available in config:

```html
<script
  id="npmlib-descopeweb-components-ui-12345"
  src="https://descopecdn.com/npm/@descope/web-components-ui@1.0.0/dist/umd/index.js"
  integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K..."
  crossorigin="anonymous"
></script>
```

Without SRI hash (backward compatible):

```html
<script
  id="npmlib-descopeweb-components-ui-12345"
  src="https://descopecdn.com/npm/@descope/web-components-ui@1.0.0/dist/umd/index.js"
></script>
```

### With CSP

For strict Content Security Policy:

```html
<descope-wc
  project-id="myProjectId"
  flow-id="sign-up-or-in"
  nonce="random-nonce-value"
></descope-wc>
```

CSP header:

```
Content-Security-Policy:
  script-src 'self'
    https://descopecdn.com
    https://static.descope.com
    https://cdn.jsdelivr.net
    'nonce-random-nonce-value';
```

## Security Benefits

1. **Tamper Detection**: Browser verifies script hasn't been modified
2. **CDN Compromise Protection**: Even if CDN is compromised, tampered scripts won't execute
3. **Man-in-the-Middle Protection**: MITM attacks can't modify the script
4. **Compliance**: Meets April 2025 security requirements

## Backward Compatibility

- ✅ No breaking changes
- ✅ Works with or without SRI hash in config
- ✅ Existing projects continue to function normally
- ✅ Automatic upgrade when backend deploys SRI support

## Browser Support

SRI is supported by all modern browsers:

- Chrome/Edge: Yes
- Firefox: Yes
- Safari: Yes (10.1+)
- Opera: Yes

Older browsers that don't support SRI will ignore the integrity attribute and load the script normally.

## Implementation Checklist

- [x] Update type definitions
- [x] Modify script injection helpers
- [x] Update descopeUiMixin
- [x] Add comprehensive tests
- [x] Update documentation
- [x] Verify backward compatibility
- [x] Test with CSP

## Related PRs

- Backend: [orchestrationservice#5339](https://github.com/descope/orchestrationservice/pull/5339)
- Frontend: This implementation

## References

- [MDN: Subresource Integrity](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity)
- [W3C SRI Specification](https://www.w3.org/TR/SRI/)
- [SRIHash.org](https://www.srihash.org/)
