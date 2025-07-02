import {
  buildWWWAuthenticate,
  parseWWWAuthenticate,
} from '../../src/server/oauth/resource-metadata/www-authenticate';

describe('WWW-Authenticate Builder', () => {
  describe('buildWWWAuthenticate', () => {
    it('should build basic Bearer header', () => {
      const header = buildWWWAuthenticate({});
      expect(header).toBe('Bearer');
    });

    it('should include realm', () => {
      const header = buildWWWAuthenticate({ realm: 'Example API' });
      expect(header).toBe('Bearer, realm="Example API"');
    });

    it('should include scope', () => {
      const header = buildWWWAuthenticate({ scope: 'read write' });
      expect(header).toBe('Bearer, scope="read write"');
    });

    it('should include error information', () => {
      const header = buildWWWAuthenticate({
        error: 'insufficient_scope',
        error_description: 'Missing required scopes: admin',
        scope: 'admin',
      });
      expect(header).toContain('error="insufficient_scope"');
      expect(header).toContain(
        'error_description="Missing required scopes: admin"',
      );
      expect(header).toContain('scope="admin"');
    });

    it('should include multiple authorization servers', () => {
      const header = buildWWWAuthenticate({
        authorizationServers: [
          'https://auth1.example.com',
          'https://auth2.example.com',
        ],
      });
      expect(header).toContain(
        'as_uri="https://auth1.example.com https://auth2.example.com"',
      );
    });

    it('should escape special characters', () => {
      const header = buildWWWAuthenticate({
        realm: 'API with "quotes"',
        error: 'invalid_token',
        error_description: 'Error with\nnewline',
      });
      expect(header).toContain('realm="API with \\"quotes\\""');
      expect(header).toContain('error_description="Error with newline"');
    });
  });

  describe('parseWWWAuthenticate', () => {
    it('should parse basic Bearer header', () => {
      const params = parseWWWAuthenticate('Bearer');
      expect(params).toEqual({});
    });

    it('should parse header with all parameters', () => {
      const header =
        'Bearer, realm="Example API", scope="read write", error="insufficient_scope", error_description="Missing scopes", as_uri="https://auth.example.com"';
      const params = parseWWWAuthenticate(header);

      expect(params).toEqual({
        realm: 'Example API',
        scope: 'read write',
        error: 'insufficient_scope',
        error_description: 'Missing scopes',
        authorizationServers: ['https://auth.example.com'],
      });
    });
  });
});
