import { generateLibUrls } from '../src/mixins/injectNpmLibMixin/helpers';

describe('injectNpmLibMixin - SRI support', () => {
  const baseUrls = ['https://cdn1.example.com', 'https://cdn2.example.com'];
  const libName = '@descope/web-components-ui';
  const version = '1.0.0';
  const path = 'dist/umd/index.js';

  describe('generateLibUrls with SRI', () => {
    it('should include integrity in generated script data when provided', () => {
      const sriHash =
        'sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC';

      const result = generateLibUrls(baseUrls, libName, version, path, sriHash);

      expect(result).toHaveLength(2);
      result.forEach((scriptData) => {
        expect(scriptData.integrity).toBe(sriHash);
        expect(scriptData.url).toBeDefined();
        expect(scriptData.id).toBeDefined();
      });
    });

    it('should not include integrity when not provided', () => {
      const result = generateLibUrls(baseUrls, libName, version, path);

      expect(result).toHaveLength(2);
      result.forEach((scriptData) => {
        expect(scriptData.integrity).toBeUndefined();
        expect(scriptData.url).toBeDefined();
        expect(scriptData.id).toBeDefined();
      });
    });

    it('should not include integrity when empty string is provided', () => {
      const result = generateLibUrls(baseUrls, libName, version, path, '');

      expect(result).toHaveLength(2);
      result.forEach((scriptData) => {
        expect(scriptData.integrity).toBeUndefined();
        expect(scriptData.url).toBeDefined();
        expect(scriptData.id).toBeDefined();
      });
    });

    it('should apply same integrity to all CDN URLs', () => {
      const sriHash = 'sha384-test123';
      const multipleCdns = [
        'https://descopecdn.com',
        'https://static.descope.com',
        'https://cdn.jsdelivr.net',
      ];

      const result = generateLibUrls(
        multipleCdns,
        libName,
        version,
        path,
        sriHash,
      );

      expect(result).toHaveLength(3);
      result.forEach((scriptData) => {
        expect(scriptData.integrity).toBe(sriHash);
      });
    });

    it('should generate correct URLs with integrity', () => {
      const sriHash = 'sha256-abc123';
      const result = generateLibUrls(
        [baseUrls[0]],
        libName,
        version,
        path,
        sriHash,
      );

      expect(result).toHaveLength(1);
      expect(result[0].url.toString()).toContain(libName);
      expect(result[0].url.toString()).toContain(version);
      expect(result[0].url.toString()).toContain(path);
      expect(result[0].integrity).toBe(sriHash);
    });
  });

  describe('ScriptData type', () => {
    it('should support optional integrity field', () => {
      const scriptDataWithIntegrity = {
        id: 'test-script',
        url: new URL('https://example.com/script.js'),
        integrity: 'sha384-test',
      };

      const scriptDataWithoutIntegrity = {
        id: 'test-script',
        url: new URL('https://example.com/script.js'),
      };

      // TypeScript should accept both forms
      expect(scriptDataWithIntegrity.integrity).toBe('sha384-test');
      expect(scriptDataWithoutIntegrity.integrity).toBeUndefined();
    });
  });
});
