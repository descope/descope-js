import { serializeCSP } from '../src/serialize';
import type { CSPDirectives } from '../src/types';

describe('serializeCSP', () => {
  it('should serialize CSP directives to string', () => {
    const directives: CSPDirectives = {
      'script-src': ["'self'", 'https://cdn.example.com'],
      'style-src': ["'self'"],
    };

    const result = serializeCSP(directives);

    expect(result).toContain("script-src 'self' https://cdn.example.com");
    expect(result).toContain("style-src 'self'");
  });

  it('should separate directives with semicolons', () => {
    const directives: CSPDirectives = {
      'script-src': ["'self'"],
      'style-src': ["'self'"],
    };

    const result = serializeCSP(directives);

    expect(result).toMatch(/script-src .+; style-src .+/);
  });

  it('should handle empty directives', () => {
    const directives: CSPDirectives = {};

    const result = serializeCSP(directives);

    expect(result).toBe('');
  });

  it('should skip directives with empty source arrays', () => {
    const directives: CSPDirectives = {
      'script-src': ["'self'"],
      'style-src': [],
    };

    const result = serializeCSP(directives);

    expect(result).toContain('script-src');
    expect(result).not.toContain('style-src');
  });

  it('should join multiple sources with spaces', () => {
    const directives: CSPDirectives = {
      'script-src': [
        "'self'",
        'https://a.com',
        'https://b.com',
        'https://c.com',
      ],
    };

    const result = serializeCSP(directives);

    expect(result).toBe(
      "script-src 'self' https://a.com https://b.com https://c.com",
    );
  });

  it('should handle nonces in sources', () => {
    const directives: CSPDirectives = {
      'script-src': ["'self'", "'nonce-abc123'"],
      'style-src': ["'nonce-abc123'"],
    };

    const result = serializeCSP(directives);

    expect(result).toContain("'nonce-abc123'");
  });

  it('should preserve special keywords with quotes', () => {
    const directives: CSPDirectives = {
      'script-src': [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'",
        "'strict-dynamic'",
      ],
    };

    const result = serializeCSP(directives);

    expect(result).toContain("'self'");
    expect(result).toContain("'unsafe-inline'");
    expect(result).toContain("'unsafe-eval'");
    expect(result).toContain("'strict-dynamic'");
  });

  it('should handle data: and blob: schemes', () => {
    const directives: CSPDirectives = {
      'img-src': ["'self'", 'data:', 'blob:'],
    };

    const result = serializeCSP(directives);

    expect(result).toContain('data:');
    expect(result).toContain('blob:');
  });
});
