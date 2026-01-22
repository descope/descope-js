import { getDescopeDefaults } from '../src/defaults';

describe('getDescopeDefaults', () => {
  it('should return default Descope CSP directives', () => {
    const directives = getDescopeDefaults();

    expect(directives).toHaveProperty('script-src');
    expect(directives).toHaveProperty('img-src');
    expect(directives).toHaveProperty('connect-src');
  });

  it('should include default Descope URLs', () => {
    const directives = getDescopeDefaults();

    expect(directives['script-src']).toContain("'self'");
    expect(directives['script-src']).toContain('https://static.descope.com');
    expect(directives['script-src']).toContain('https://descopecdn.com');

    expect(directives['img-src']).toContain('https://static.descope.com');
    expect(directives['img-src']).toContain('https://content.app.descope.com');
    expect(directives['img-src']).toContain('https://imgs.descope.com');
    expect(directives['img-src']).toContain('data:');

    expect(directives['connect-src']).toContain("'self'");
    expect(directives['connect-src']).toContain('https://static.descope.com');
    expect(directives['connect-src']).toContain('https://api.descope.com');
  });

  it('should allow custom URLs', () => {
    const directives = getDescopeDefaults({
      api: 'api.staging.descope.com',
      cdn: 'cdn.staging.descope.com',
      static: 'static.staging.descope.com',
      images: 'imgs.staging.descope.com',
      content: 'content.staging.descope.com',
    });

    expect(directives['connect-src']).toContain(
      'https://api.staging.descope.com',
    );
    expect(directives['script-src']).toContain(
      'https://cdn.staging.descope.com',
    );
    expect(directives['script-src']).toContain(
      'https://static.staging.descope.com',
    );
    expect(directives['img-src']).toContain('https://imgs.staging.descope.com');
    expect(directives['img-src']).toContain(
      'https://content.staging.descope.com',
    );
  });

  it('should add nonce to script-src when provided', () => {
    const nonce = 'test-nonce-123';
    const directives = getDescopeDefaults(undefined, nonce);

    expect(directives['script-src']).toContain(`'nonce-${nonce}'`);
  });

  it('should add nonce to style-src when provided', () => {
    const nonce = 'test-nonce-456';
    const directives = getDescopeDefaults(undefined, nonce);

    expect(directives['style-src']).toBeDefined();
    expect(directives['style-src']).toContain(`'nonce-${nonce}'`);
  });

  it('should not include style-src without nonce', () => {
    const directives = getDescopeDefaults();

    expect(directives['style-src']).toBeUndefined();
  });

  it('should handle URLs with https:// prefix', () => {
    const directives = getDescopeDefaults({
      api: 'https://api.custom.com',
    });

    expect(directives['connect-src']).toContain('https://api.custom.com');
    expect(directives['connect-src']).not.toContain('https://https://');
  });

  it('should handle URLs with http:// prefix', () => {
    const directives = getDescopeDefaults({
      api: 'http://localhost:3000',
    });

    expect(directives['connect-src']).toContain('http://localhost:3000');
  });
});
