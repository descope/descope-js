import { checksumMixin } from '../src/mixins/checksumMixin';

describe('checksumMixin', () => {
  let element: any;

  beforeEach(() => {
    // Create a test element class with the mixin
    const MixinClass = checksumMixin(
      class {
        getAttribute(attr: string) {
          if (attr === 'base-cdn-url') return '';
          return '';
        }
      } as any,
    );

    element = new MixinClass();

    // Mock console methods
    jest.spyOn(console, 'debug').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();

    // Reset fetch mock
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('loadChecksums', () => {
    it('should load and cache checksums from CDN', async () => {
      const mockChecksums = {
        'dist/index.js': 'sha384-abc123',
        'dist/helper.js': 'sha384-def456',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockChecksums,
      });

      const checksums = await element.loadChecksums(
        '@descope/flow-scripts',
        '1.0.14',
      );

      expect(checksums).toEqual(mockChecksums);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(
          '/npm/@descope/flow-scripts@1.0.14/dist/checksums.json',
        ),
      );
    });

    it('should return cached checksums on subsequent calls', async () => {
      const mockChecksums = {
        'dist/index.js': 'sha384-abc123',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockChecksums,
      });

      // First call
      await element.loadChecksums('@descope/flow-scripts', '1.0.14');

      // Second call should use cache
      const cachedChecksums = await element.loadChecksums(
        '@descope/flow-scripts',
        '1.0.14',
      );

      expect(cachedChecksums).toEqual(mockChecksums);
      expect(global.fetch).toHaveBeenCalledTimes(1); // Only called once
    });

    it('should try fallback CDNs if primary fails', async () => {
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ 'dist/index.js': 'sha384-fallback' }),
        });

      const checksums = await element.loadChecksums(
        '@descope/flow-scripts',
        '1.0.14',
      );

      expect(checksums).toEqual({ 'dist/index.js': 'sha384-fallback' });
      expect(global.fetch).toHaveBeenCalledTimes(2); // Primary + 1 fallback
    });

    it('should return null if all CDNs fail', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const checksums = await element.loadChecksums(
        '@descope/flow-scripts',
        '1.0.14',
      );

      expect(checksums).toBeNull();
    });

    it('should return null if response is not ok', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const checksums = await element.loadChecksums(
        '@descope/flow-scripts',
        '1.0.14',
      );

      expect(checksums).toBeNull();
    });
  });

  describe('getChecksum', () => {
    it('should return the checksum for a specific file', async () => {
      const mockChecksums = {
        'dist/recaptcha.js': 'sha384-recaptcha123',
        'dist/turnstile.js': 'sha384-turnstile456',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockChecksums,
      });

      const checksum = await element.getChecksum(
        '@descope/flow-scripts',
        '1.0.14',
        'dist/recaptcha.js',
      );

      expect(checksum).toBe('sha384-recaptcha123');
    });

    it('should normalize file path by removing leading slash', async () => {
      const mockChecksums = {
        'dist/recaptcha.js': 'sha384-recaptcha123',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockChecksums,
      });

      const checksum = await element.getChecksum(
        '@descope/flow-scripts',
        '1.0.14',
        '/dist/recaptcha.js', // Leading slash
      );

      expect(checksum).toBe('sha384-recaptcha123');
    });

    it('should return undefined if checksum not found', async () => {
      const mockChecksums = {
        'dist/other.js': 'sha384-other123',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockChecksums,
      });

      const checksum = await element.getChecksum(
        '@descope/flow-scripts',
        '1.0.14',
        'dist/nonexistent.js',
      );

      expect(checksum).toBeUndefined();
    });

    it('should return undefined if checksums failed to load', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const checksum = await element.getChecksum(
        '@descope/flow-scripts',
        '1.0.14',
        'dist/any.js',
      );

      expect(checksum).toBeUndefined();
    });
  });
});
