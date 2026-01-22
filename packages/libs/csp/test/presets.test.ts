import { presets } from '../src/presets';

describe('presets', () => {
  describe('googleFonts', () => {
    it('should include Google Fonts URLs', () => {
      expect(presets.googleFonts['style-src']).toContain(
        'https://fonts.googleapis.com',
      );
      expect(presets.googleFonts['font-src']).toContain(
        'https://fonts.gstatic.com',
      );
    });
  });

  describe('segment', () => {
    it('should include Segment analytics URLs', () => {
      expect(presets.segment['script-src']).toContain(
        'https://cdn.segment.com',
      );
      expect(presets.segment['connect-src']).toContain(
        'https://api.segment.io',
      );
      expect(presets.segment['connect-src']).toContain(
        'https://cdn.segment.com',
      );
    });
  });

  describe('featureOS', () => {
    it('should include Feature OS widget URLs', () => {
      expect(presets.featureOS['script-src']).toContain(
        'https://widgets-v3.featureos.app',
      );
      expect(presets.featureOS['frame-src']).toContain(
        'https://widgets-v3.featureos.app',
      );
    });
  });

  describe('devRev', () => {
    it('should include DevRev platform URLs', () => {
      expect(presets.devRev['script-src']).toContain(
        'https://plug-platform.devrev.ai',
      );
      expect(presets.devRev['connect-src']).toContain(
        'https://plug-platform.devrev.ai',
      );
      expect(presets.devRev['connect-src']).toContain('https://api.devrev.ai');
      expect(presets.devRev['frame-src']).toContain(
        'https://plug-platform.devrev.ai',
      );
    });
  });

  describe('jsdelivr', () => {
    it('should include jsDelivr CDN URLs', () => {
      expect(presets.jsdelivr['script-src']).toContain(
        'https://cdn.jsdelivr.net',
      );
      expect(presets.jsdelivr['connect-src']).toContain(
        'https://cdn.jsdelivr.net',
      );
    });
  });

  describe('npmRegistry', () => {
    it('should include NPM registry access', () => {
      expect(presets.npmRegistry['connect-src']).toContain(
        'https://registry.npmjs.org/@descope/flow-components',
      );
    });
  });

  describe('descopeInternal', () => {
    it('should include Descope internal tool URLs', () => {
      expect(presets.descopeInternal['script-src']).toContain(
        'https://dev-panel.preview.descope.org',
      );
      expect(presets.descopeInternal['style-src']).toContain(
        'https://static.descope.org',
      );
      expect(presets.descopeInternal['style-src']).toContain(
        'https://imgs.descope.com',
      );
      expect(presets.descopeInternal['img-src']).toContain(
        'https://imgs.descope.com',
      );
      expect(presets.descopeInternal['img-src']).toContain(
        'https://static.descope.com',
      );
      expect(presets.descopeInternal['font-src']).toContain(
        'https://descopecdn.com',
      );
      expect(presets.descopeInternal['connect-src']).toContain(
        'https://descopecdn.com',
      );
      expect(presets.descopeInternal['connect-src']).toContain(
        'https://imgs.descope.com',
      );
    });
  });

  describe('all presets', () => {
    it('should export all expected presets', () => {
      expect(presets).toHaveProperty('googleFonts');
      expect(presets).toHaveProperty('segment');
      expect(presets).toHaveProperty('featureOS');
      expect(presets).toHaveProperty('devRev');
      expect(presets).toHaveProperty('jsdelivr');
      expect(presets).toHaveProperty('npmRegistry');
      expect(presets).toHaveProperty('descopeInternal');
    });

    it('should have 7 presets', () => {
      expect(Object.keys(presets)).toHaveLength(7);
    });
  });
});
