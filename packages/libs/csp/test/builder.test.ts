import { createDescopeCSP } from '../src/builder';
import { presets } from '../src/presets';

describe('createDescopeCSP', () => {
  it('should create CSP with default Descope settings', () => {
    const result = createDescopeCSP();

    expect(result).toHaveProperty('directives');
    expect(result).toHaveProperty('toString');
    expect(typeof result.toString).toBe('function');
  });

  it('should include default Descope URLs', () => {
    const result = createDescopeCSP();

    expect(result.directives['script-src']).toContain(
      'https://static.descope.com',
    );
    expect(result.directives['script-src']).toContain('https://descopecdn.com');
    expect(result.directives['connect-src']).toContain(
      'https://api.descope.com',
    );
  });

  it('should accept custom URLs', () => {
    const result = createDescopeCSP({
      urls: {
        api: 'api.staging.descope.com',
        cdn: 'cdn.staging.descope.com',
      },
    });

    expect(result.directives['connect-src']).toContain(
      'https://api.staging.descope.com',
    );
    expect(result.directives['script-src']).toContain(
      'https://cdn.staging.descope.com',
    );
  });

  it('should add nonce when provided', () => {
    const nonce = 'test-nonce-123';
    const result = createDescopeCSP({ nonce });

    expect(result.directives['script-src']).toContain(`'nonce-${nonce}'`);
    expect(result.directives['style-src']).toContain(`'nonce-${nonce}'`);
  });

  it('should merge custom directives', () => {
    const result = createDescopeCSP({
      extend: {
        'connect-src': ['https://api.myapp.com'],
        'img-src': ['https://images.myapp.com'],
      },
    });

    expect(result.directives['connect-src']).toContain('https://api.myapp.com');
    expect(result.directives['img-src']).toContain('https://images.myapp.com');
  });

  it('should not override Descope defaults when extending', () => {
    const result = createDescopeCSP({
      extend: {
        'script-src': ['https://custom.com'],
      },
    });

    expect(result.directives['script-src']).toContain(
      'https://static.descope.com',
    );
    expect(result.directives['script-src']).toContain('https://descopecdn.com');
    expect(result.directives['script-src']).toContain('https://custom.com');
  });

  it('should merge presets', () => {
    const result = createDescopeCSP({
      presets: [presets.googleFonts],
    });

    expect(result.directives['style-src']).toContain(
      'https://fonts.googleapis.com',
    );
    expect(result.directives['font-src']).toContain(
      'https://fonts.gstatic.com',
    );
  });

  it('should merge multiple presets', () => {
    const result = createDescopeCSP({
      presets: [presets.googleFonts, presets.segment],
    });

    expect(result.directives['style-src']).toContain(
      'https://fonts.googleapis.com',
    );
    expect(result.directives['script-src']).toContain(
      'https://cdn.segment.com',
    );
  });

  it('should combine nonce, presets, and custom directives', () => {
    const nonce = 'combined-test';
    const result = createDescopeCSP({
      nonce,
      presets: [presets.segment],
      extend: {
        'connect-src': ['https://api.myapp.com'],
      },
    });

    expect(result.directives['script-src']).toContain(`'nonce-${nonce}'`);
    expect(result.directives['script-src']).toContain(
      'https://cdn.segment.com',
    );
    expect(result.directives['connect-src']).toContain('https://api.myapp.com');
  });

  it('should return valid CSP string', () => {
    const result = createDescopeCSP();
    const cspString = result.toString();

    expect(typeof cspString).toBe('string');
    expect(cspString).toContain('script-src');
    expect(cspString).toContain(';');
  });

  it('should handle empty options', () => {
    const result = createDescopeCSP({});

    expect(result.directives).toBeDefined();
    expect(result.toString()).toBeTruthy();
  });

  it('should deduplicate sources across all merges', () => {
    const result = createDescopeCSP({
      extend: {
        'script-src': ['https://static.descope.com'],
      },
    });

    const scriptSrc = result.directives['script-src']!;
    const duplicates = scriptSrc.filter(
      (s) => s === 'https://static.descope.com',
    );

    expect(duplicates).toHaveLength(1);
  });
});
