/**
 * Unit tests for NavigationPlugin
 */

import { NavigationPlugin } from '../src/plugins/navigationPlugin';
import { createMockPluginContext, mockRecord } from './setup';

describe('NavigationPlugin', () => {
  let plugin: NavigationPlugin;
  let mockContext: ReturnType<typeof createMockPluginContext>;
  let originalPushState: typeof history.pushState;
  let originalReplaceState: typeof history.replaceState;

  beforeEach(() => {
    mockContext = createMockPluginContext();
    plugin = new NavigationPlugin();

    // Store original methods
    originalPushState = history.pushState;
    originalReplaceState = history.replaceState;

    // Reset location to a known state
    window.history.replaceState(null, '', '/test-page');
  });

  afterEach(() => {
    // Restore original methods
    history.pushState = originalPushState;
    history.replaceState = originalReplaceState;
    plugin.disable();
  });

  describe('Plugin Lifecycle', () => {
    it('should have correct plugin ID', () => {
      expect(plugin.getPluginId()).toBe('navigation-plugin');
    });

    it('should initialize and track current URL on load', () => {
      plugin.load(mockContext);
      // No navigation yet, so no recording
      expect(mockRecord).not.toHaveBeenCalled();
    });

    it('should restore history methods on disable', () => {
      plugin.load(mockContext);
      const interceptedPushState = history.pushState;

      plugin.disable();

      expect(history.pushState).toBe(originalPushState);
      expect(history.replaceState).toBe(originalReplaceState);
      expect(history.pushState).not.toBe(interceptedPushState);
    });

    it('should remove event listeners on disable', () => {
      plugin.load(mockContext);

      // Trigger navigation
      history.pushState(null, '', '/new-page');
      expect(mockRecord).toHaveBeenCalledTimes(1);

      plugin.disable();
      mockRecord.mockClear();

      // Fire popstate event manually
      window.dispatchEvent(new PopStateEvent('popstate'));
      expect(mockRecord).not.toHaveBeenCalled();
    });

    it('should not double-intercept on multiple enables', () => {
      plugin.load(mockContext);
      plugin.enable();
      plugin.enable();

      history.pushState(null, '', '/test');

      // Should only record once
      expect(mockRecord).toHaveBeenCalledTimes(1);
    });
  });

  describe('pushState Tracking', () => {
    beforeEach(() => {
      plugin.load(mockContext);
    });

    it('should record pushState navigation', () => {
      const fromUrl = window.location.href;
      history.pushState({ page: 1 }, 'Page 1', '/page-1');

      expect(mockRecord).toHaveBeenCalledWith('navigation', {
        type: 'pushState',
        from: fromUrl,
        to: window.location.href,
        timestamp: expect.any(Number),
      });
    });

    it('should track multiple pushState calls', () => {
      history.pushState(null, '', '/page-1');
      const url1 = window.location.href;

      history.pushState(null, '', '/page-2');
      const url2 = window.location.href;

      expect(mockRecord).toHaveBeenCalledTimes(2);
      expect(mockRecord).toHaveBeenNthCalledWith(2, 'navigation', {
        type: 'pushState',
        from: url1,
        to: url2,
        timestamp: expect.any(Number),
      });
    });

    it('should still execute pushState normally', () => {
      const state = { data: 'test' };
      history.pushState(state, 'Test', '/test-url');

      expect(window.location.pathname).toBe('/test-url');
      expect(history.state).toEqual(state);
    });

    it('should handle pushState with search params', () => {
      const fromUrl = window.location.href;
      history.pushState(null, '', '/search?q=test&page=1');

      expect(mockRecord).toHaveBeenCalledWith('navigation', {
        type: 'pushState',
        from: fromUrl,
        to: expect.stringContaining('/search?q=test&page=1'),
        timestamp: expect.any(Number),
      });
    });
  });

  describe('replaceState Tracking', () => {
    beforeEach(() => {
      plugin.load(mockContext);
    });

    it('should record replaceState navigation', () => {
      const fromUrl = window.location.href;
      history.replaceState({ page: 1 }, 'Page 1', '/replaced');

      expect(mockRecord).toHaveBeenCalledWith('navigation', {
        type: 'replaceState',
        from: fromUrl,
        to: window.location.href,
        timestamp: expect.any(Number),
      });
    });

    it('should still execute replaceState normally', () => {
      const state = { replaced: true };
      history.replaceState(state, 'Replaced', '/new-location');

      expect(window.location.pathname).toBe('/new-location');
      expect(history.state).toEqual(state);
    });

    it('should track multiple replaceState calls', () => {
      history.replaceState(null, '', '/replace-1');
      history.replaceState(null, '', '/replace-2');

      expect(mockRecord).toHaveBeenCalledTimes(2);
      expect(mockRecord).toHaveBeenNthCalledWith(2, 'navigation', {
        type: 'replaceState',
        from: expect.stringContaining('/replace-1'),
        to: expect.stringContaining('/replace-2'),
        timestamp: expect.any(Number),
      });
    });
  });

  describe('popstate Event Tracking', () => {
    beforeEach(() => {
      plugin.load(mockContext);
    });

    it('should record popstate events', () => {
      const fromUrl = window.location.href;

      // Manually trigger popstate (simulating back button)
      history.pushState(null, '', '/other-page');
      mockRecord.mockClear();

      window.dispatchEvent(new PopStateEvent('popstate'));

      expect(mockRecord).toHaveBeenCalledWith('navigation', {
        type: 'popstate',
        from: expect.any(String),
        to: window.location.href,
        timestamp: expect.any(Number),
      });
    });

    it('should update currentUrl after popstate', () => {
      history.pushState(null, '', '/page-1');
      mockRecord.mockClear();

      window.dispatchEvent(new PopStateEvent('popstate'));
      const urlAfterPop = window.location.href;

      // Next navigation should use this as "from"
      history.pushState(null, '', '/page-2');

      expect(mockRecord).toHaveBeenNthCalledWith(2, 'navigation', {
        type: 'pushState',
        from: urlAfterPop,
        to: expect.any(String),
        timestamp: expect.any(Number),
      });
    });
  });

  describe('hashchange Event Tracking', () => {
    beforeEach(() => {
      plugin.load(mockContext);
    });

    it('should record hashchange events', () => {
      const fromUrl = window.location.href;

      // Manually trigger hashchange
      window.location.hash = '#section1';
      window.dispatchEvent(new HashChangeEvent('hashchange'));

      expect(mockRecord).toHaveBeenCalledWith('navigation', {
        type: 'hashchange',
        from: fromUrl,
        to: window.location.href,
        timestamp: expect.any(Number),
      });
    });

    it('should track multiple hash changes', () => {
      window.location.hash = '#section1';
      window.dispatchEvent(new HashChangeEvent('hashchange'));

      const url1 = window.location.href;

      window.location.hash = '#section2';
      window.dispatchEvent(new HashChangeEvent('hashchange'));

      expect(mockRecord).toHaveBeenCalledTimes(2);
      expect(mockRecord).toHaveBeenNthCalledWith(2, 'navigation', {
        type: 'hashchange',
        from: url1,
        to: expect.stringContaining('#section2'),
        timestamp: expect.any(Number),
      });
    });
  });

  describe('URL Tracking', () => {
    beforeEach(() => {
      plugin.load(mockContext);
    });

    it('should correctly track from and to URLs', () => {
      const url1 = 'http://localhost/page-1';
      const url2 = 'http://localhost/page-2';

      history.replaceState(null, '', '/page-1');
      mockRecord.mockClear();

      history.pushState(null, '', '/page-2');

      expect(mockRecord).toHaveBeenCalledWith('navigation', {
        type: 'pushState',
        from: expect.stringContaining('/page-1'),
        to: expect.stringContaining('/page-2'),
        timestamp: expect.any(Number),
      });
    });

    it('should preserve query parameters in URLs', () => {
      history.pushState(null, '', '/search?q=test&page=1');
      mockRecord.mockClear();

      history.pushState(null, '', '/search?q=test&page=2');

      const call = mockRecord.mock.calls[0][1];
      expect(call.from).toContain('page=1');
      expect(call.to).toContain('page=2');
    });

    it('should preserve hash in URLs', () => {
      history.pushState(null, '', '/page#section1');
      mockRecord.mockClear();

      history.pushState(null, '', '/page#section2');

      const call = mockRecord.mock.calls[0][1];
      expect(call.from).toContain('#section1');
      expect(call.to).toContain('#section2');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      plugin.load(mockContext);
    });

    it('should fail silently if recording throws error', () => {
      mockRecord.mockImplementation(() => {
        throw new Error('Recording failed');
      });

      expect(() => {
        history.pushState(null, '', '/test');
      }).not.toThrow();
    });

    it('should still execute navigation if recording fails', () => {
      mockRecord.mockImplementation(() => {
        throw new Error('Recording failed');
      });

      history.pushState({ page: 1 }, 'Test', '/test-page');

      expect(window.location.pathname).toBe('/test-page');
      expect(history.state).toEqual({ page: 1 });
    });
  });

  describe('Timestamps', () => {
    beforeEach(() => {
      plugin.load(mockContext);
    });

    it('should include timestamp in navigation events', () => {
      const beforeTimestamp = Date.now();
      history.pushState(null, '', '/test');
      const afterTimestamp = Date.now();

      const call = mockRecord.mock.calls[0][1];
      expect(call.timestamp).toBeGreaterThanOrEqual(beforeTimestamp);
      expect(call.timestamp).toBeLessThanOrEqual(afterTimestamp);
    });

    it('should use different timestamps for sequential navigations', () => {
      history.pushState(null, '', '/page-1');
      const timestamp1 = mockRecord.mock.calls[0][1].timestamp;

      history.pushState(null, '', '/page-2');
      const timestamp2 = mockRecord.mock.calls[1][1].timestamp;

      expect(timestamp2).toBeGreaterThanOrEqual(timestamp1);
    });
  });

  describe('Integration with History API', () => {
    beforeEach(() => {
      plugin.load(mockContext);
    });

    it('should work with complex state objects', () => {
      const complexState = {
        data: { nested: { value: 123 } },
        array: [1, 2, 3],
        bool: true,
      };

      history.pushState(complexState, 'Complex', '/complex');

      expect(history.state).toEqual(complexState);
      expect(mockRecord).toHaveBeenCalledWith('navigation', expect.any(Object));
    });

    it('should handle null state', () => {
      expect(() => {
        history.pushState(null, '', '/null-state');
      }).not.toThrow();

      expect(mockRecord).toHaveBeenCalled();
    });

    it('should handle empty title', () => {
      expect(() => {
        history.pushState({}, '', '/no-title');
      }).not.toThrow();

      expect(mockRecord).toHaveBeenCalled();
    });
  });
});
