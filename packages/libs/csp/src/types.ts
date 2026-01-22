/**
 * CSP directive names as defined in the Content Security Policy specification.
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy
 */
export type CSPDirectiveName =
  | 'default-src'
  | 'script-src'
  | 'style-src'
  | 'img-src'
  | 'font-src'
  | 'connect-src'
  | 'media-src'
  | 'object-src'
  | 'frame-src'
  | 'worker-src'
  | 'manifest-src'
  | 'form-action'
  | 'frame-ancestors'
  | 'base-uri'
  | 'child-src'
  | 'report-uri'
  | 'report-to'
  | 'upgrade-insecure-requests'
  | 'block-all-mixed-content';

/**
 * CSP source values - can be keywords (with quotes) or URLs.
 * Keywords must be quoted: "'self'", "'none'", "'unsafe-inline'", etc.
 * URLs should be full domains: "https://example.com"
 */
export type CSPSource = string;

/**
 * CSP directives mapping directive names to arrays of sources.
 */
export interface CSPDirectives {
  'default-src'?: CSPSource[];
  'script-src'?: CSPSource[];
  'style-src'?: CSPSource[];
  'img-src'?: CSPSource[];
  'font-src'?: CSPSource[];
  'connect-src'?: CSPSource[];
  'media-src'?: CSPSource[];
  'object-src'?: CSPSource[];
  'frame-src'?: CSPSource[];
  'worker-src'?: CSPSource[];
  'manifest-src'?: CSPSource[];
  'form-action'?: CSPSource[];
  'frame-ancestors'?: CSPSource[];
  'base-uri'?: CSPSource[];
  'child-src'?: CSPSource[];
  'report-uri'?: CSPSource[];
  'report-to'?: CSPSource[];
  'upgrade-insecure-requests'?: CSPSource[];
  'block-all-mixed-content'?: CSPSource[];
}

/**
 * Descope-specific URLs that can be customized per environment.
 */
export interface DescopeURLs {
  /**
   * Descope API domain.
   * @default "api.descope.com"
   * @example "api.staging.descope.com"
   */
  api?: string;

  /**
   * Descope CDN domain for flow components and assets.
   * @default "descopecdn.com"
   * @example "cdn.staging.descope.com"
   */
  cdn?: string;

  /**
   * Descope static assets domain.
   * @default "static.descope.com"
   * @example "static.staging.descope.com"
   */
  static?: string;

  /**
   * Descope images domain.
   * @default "imgs.descope.com"
   * @example "imgs.staging.descope.com"
   */
  images?: string;

  /**
   * Descope content domain.
   * @default "content.app.descope.com"
   * @example "content.app.staging.descope.com"
   */
  content?: string;
}

/**
 * Options for creating a Descope CSP policy.
 */
export interface DescopeCSPOptions {
  /**
   * Custom Descope URLs to use instead of defaults.
   * Useful for staging/preview environments or self-hosted instances.
   */
  urls?: DescopeURLs;

  /**
   * A cryptographically secure nonce to allow inline scripts/styles.
   * Must be generated per-request and unique.
   * Will be added to script-src and style-src as 'nonce-{value}'.
   */
  nonce?: string;

  /**
   * Additional CSP directives to extend the Descope defaults.
   * Sources are additive - they will be merged with base Descope policy.
   *
   * @example
   * ```ts
   * {
   *   extend: {
   *     'connect-src': ['https://api.myapp.com'],
   *     'img-src': ['https://images.myapp.com']
   *   }
   * }
   * ```
   */
  extend?: CSPDirectives;

  /**
   * Preset policies to include (e.g., Google Fonts, analytics).
   * These will be merged additively with the base Descope policy.
   */
  presets?: CSPDirectives[];

  /**
   * Enable validation warnings in development.
   * @default true in development, false in production
   */
  validate?: boolean;
}

/**
 * Result of creating a CSP policy.
 */
export interface CSPResult {
  /**
   * CSP directives as an object.
   * Useful for programmatic access or framework-specific formatting.
   */
  directives: CSPDirectives;

  /**
   * CSP policy as a formatted string ready for the Content-Security-Policy header.
   *
   * @example
   * "default-src 'self'; script-src 'self' 'nonce-xyz' https://cdn.example.com; ..."
   */
  toString(): string;
}

/**
 * Options for nonce generation.
 */
export interface NonceOptions {
  /**
   * Length of the random byte array.
   * @default 32
   */
  length?: number;

  /**
   * Encoding format for the nonce.
   * @default "base64"
   */
  encoding?: 'base64' | 'hex';
}

/**
 * A preset CSP policy that can be merged with other policies.
 */
export type CSPPreset = CSPDirectives;

/**
 * Validation warning for CSP configuration.
 */
export interface ValidationWarning {
  directive: CSPDirectiveName;
  source: CSPSource;
  message: string;
  severity: 'warning' | 'error';
}
