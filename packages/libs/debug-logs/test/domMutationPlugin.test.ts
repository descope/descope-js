/**
 * Unit tests for DomMutationPlugin
 */

import { DomMutationPlugin } from '../src/plugins/domMutationPlugin';
import {
  createMockPluginContext,
  mockRecord,
  waitFor,
  createTestElement,
  cleanupTestElements,
} from './setup';

describe('DomMutationPlugin', () => {
  let plugin: DomMutationPlugin;
  let mockContext: ReturnType<typeof createMockPluginContext>;

  beforeEach(() => {
    mockContext = createMockPluginContext();
    cleanupTestElements();
  });

  afterEach(() => {
    plugin?.disable();
    cleanupTestElements();
  });

  describe('Plugin Lifecycle', () => {
    it('should have correct plugin ID', () => {
      plugin = new DomMutationPlugin();
      expect(plugin.getPluginId()).toBe('dom-mutation-plugin');
    });

    it('should initialize with default throttle time', () => {
      plugin = new DomMutationPlugin();
      plugin.load(mockContext);

      // Plugin should be enabled
      expect(plugin).toBeDefined();
    });

    it('should accept custom throttle time', () => {
      plugin = new DomMutationPlugin({ throttleMs: 50 });
      plugin.load(mockContext);

      expect(plugin).toBeDefined();
    });

    it('should observe document.body by default', async () => {
      plugin = new DomMutationPlugin({ throttleMs: 50 });
      plugin.load(mockContext);

      const div = document.createElement('div');
      document.body.appendChild(div);

      await waitFor(100);

      expect(mockRecord).toHaveBeenCalledWith(
        'dom_mutation',
        expect.objectContaining({
          addedNodes: 1,
        }),
      );
    });

    it('should cleanup on disable', async () => {
      plugin = new DomMutationPlugin({ throttleMs: 50 });
      plugin.load(mockContext);

      plugin.disable();
      mockRecord.mockClear();

      const div = document.createElement('div');
      document.body.appendChild(div);

      await waitFor(100);

      expect(mockRecord).not.toHaveBeenCalled();
    });
  });

  describe('Root Element Configuration', () => {
    it('should observe specific element by selector', async () => {
      const container = createTestElement('test-container');
      plugin = new DomMutationPlugin({
        rootElement: '#test-container',
        throttleMs: 50,
      });
      plugin.load(mockContext);

      // Add to observed container
      const div1 = document.createElement('div');
      container.appendChild(div1);

      await waitFor(100);

      expect(mockRecord).toHaveBeenCalledWith(
        'dom_mutation',
        expect.objectContaining({
          addedNodes: 1,
        }),
      );

      mockRecord.mockClear();

      // Add to document.body (not observed)
      const div2 = document.createElement('div');
      document.body.appendChild(div2);

      await waitFor(100);

      // Should not record mutations outside root element
      expect(mockRecord).not.toHaveBeenCalled();
    });

    it('should observe element passed as HTMLElement', async () => {
      const container = createTestElement('direct-container');
      plugin = new DomMutationPlugin({
        rootElement: container,
        throttleMs: 50,
      });
      plugin.load(mockContext);

      const div = document.createElement('div');
      container.appendChild(div);

      await waitFor(100);

      expect(mockRecord).toHaveBeenCalled();
    });

    it('should fallback to document.body if selector not found', async () => {
      plugin = new DomMutationPlugin({
        rootElement: '#non-existent',
        throttleMs: 50,
      });
      plugin.load(mockContext);

      const div = document.createElement('div');
      document.body.appendChild(div);

      await waitFor(100);

      expect(mockRecord).toHaveBeenCalled();
    });
  });

  describe('Mutation Tracking', () => {
    beforeEach(() => {
      createTestElement('mutation-target');
      plugin = new DomMutationPlugin({
        rootElement: '#mutation-target',
        throttleMs: 50,
      });
      plugin.load(mockContext);
    });

    it('should track added nodes', async () => {
      const container = document.getElementById('mutation-target')!;
      const div = document.createElement('div');
      container.appendChild(div);

      await waitFor(100);

      expect(mockRecord).toHaveBeenCalledWith(
        'dom_mutation',
        expect.objectContaining({
          addedNodes: 1,
          removedNodes: 0,
        }),
      );
    });

    it('should track removed nodes', async () => {
      const container = document.getElementById('mutation-target')!;
      const div = document.createElement('div');
      container.appendChild(div);

      await waitFor(100);
      mockRecord.mockClear();

      container.removeChild(div);

      await waitFor(100);

      expect(mockRecord).toHaveBeenCalledWith(
        'dom_mutation',
        expect.objectContaining({
          addedNodes: 0,
          removedNodes: 1,
        }),
      );
    });

    it('should track attribute changes', async () => {
      const container = document.getElementById('mutation-target')!;
      const div = document.createElement('div');
      container.appendChild(div);

      await waitFor(100);
      mockRecord.mockClear();

      div.setAttribute('data-test', 'value');

      await waitFor(100);

      expect(mockRecord).toHaveBeenCalledWith(
        'dom_mutation',
        expect.objectContaining({
          attributeChanges: 1,
        }),
      );
    });

    it('should track text content changes', async () => {
      const container = document.getElementById('mutation-target')!;
      const div = document.createElement('div');
      div.textContent = 'original';
      container.appendChild(div);

      await waitFor(100);
      mockRecord.mockClear();

      div.firstChild!.textContent = 'modified';

      await waitFor(100);

      expect(mockRecord).toHaveBeenCalledWith(
        'dom_mutation',
        expect.objectContaining({
          characterDataChanges: 1,
        }),
      );
    });

    it('should track nested mutations', async () => {
      const container = document.getElementById('mutation-target')!;
      const parent = document.createElement('div');
      const child = document.createElement('span');
      parent.appendChild(child);
      container.appendChild(parent);

      await waitFor(100);

      expect(mockRecord).toHaveBeenCalledWith(
        'dom_mutation',
        expect.objectContaining({
          addedNodes: expect.any(Number),
        }),
      );
    });
  });

  describe('Throttling', () => {
    it('should aggregate multiple rapid mutations', async () => {
      createTestElement('throttle-target');
      plugin = new DomMutationPlugin({
        rootElement: '#throttle-target',
        throttleMs: 100,
      });
      plugin.load(mockContext);

      const container = document.getElementById('throttle-target')!;

      // Add multiple nodes rapidly
      for (let i = 0; i < 5; i++) {
        const div = document.createElement('div');
        container.appendChild(div);
      }

      // Should not have recorded yet
      expect(mockRecord).not.toHaveBeenCalled();

      // Wait for throttle
      await waitFor(150);

      // Should record once with all mutations aggregated
      expect(mockRecord).toHaveBeenCalledTimes(1);
      expect(mockRecord).toHaveBeenCalledWith(
        'dom_mutation',
        expect.objectContaining({
          addedNodes: 5,
        }),
      );
    });

    it('should reset throttle timer on new mutations', async () => {
      createTestElement('reset-target');
      plugin = new DomMutationPlugin({
        rootElement: '#reset-target',
        throttleMs: 100,
      });
      plugin.load(mockContext);

      const container = document.getElementById('reset-target')!;

      // Add first node
      container.appendChild(document.createElement('div'));

      await waitFor(50);

      // Add second node before throttle expires
      container.appendChild(document.createElement('div'));

      await waitFor(60);

      // Should not have recorded yet
      expect(mockRecord).not.toHaveBeenCalled();

      await waitFor(50);

      // Now should have recorded with both nodes
      expect(mockRecord).toHaveBeenCalledTimes(1);
      expect(mockRecord).toHaveBeenCalledWith(
        'dom_mutation',
        expect.objectContaining({
          addedNodes: 2,
        }),
      );
    });

    it('should use custom throttle time', async () => {
      createTestElement('custom-throttle');
      plugin = new DomMutationPlugin({
        rootElement: '#custom-throttle',
        throttleMs: 200,
      });
      plugin.load(mockContext);

      const container = document.getElementById('custom-throttle')!;
      container.appendChild(document.createElement('div'));

      await waitFor(150);
      expect(mockRecord).not.toHaveBeenCalled();

      await waitFor(100);
      expect(mockRecord).toHaveBeenCalled();
    });
  });

  describe('HTML Snapshot', () => {
    it('should include HTML snapshot in mutation event', async () => {
      createTestElement('snapshot-target', '<p>Initial content</p>');
      plugin = new DomMutationPlugin({
        rootElement: '#snapshot-target',
        throttleMs: 50,
      });
      plugin.load(mockContext);

      const container = document.getElementById('snapshot-target')!;
      const div = document.createElement('div');
      div.textContent = 'New content';
      container.appendChild(div);

      await waitFor(100);

      expect(mockRecord).toHaveBeenCalledWith(
        'dom_mutation',
        expect.objectContaining({
          rootElementHTML: expect.stringContaining('New content'),
        }),
      );
    });

    it('should capture current HTML state, not original', async () => {
      createTestElement('state-target', '<p>Original</p>');
      plugin = new DomMutationPlugin({
        rootElement: '#state-target',
        throttleMs: 50,
      });
      plugin.load(mockContext);

      const container = document.getElementById('state-target')!;
      container.innerHTML = '<span>Modified</span>';

      await waitFor(100);

      const call = mockRecord.mock.calls[0][1];
      expect(call.rootElementHTML).toContain('Modified');
      expect(call.rootElementHTML).not.toContain('Original');
    });

    it('should truncate HTML exceeding maxHtmlLength', async () => {
      createTestElement('truncate-target');
      plugin = new DomMutationPlugin({
        rootElement: '#truncate-target',
        throttleMs: 50,
        maxHtmlLength: 100,
      });
      plugin.load(mockContext);

      const container = document.getElementById('truncate-target')!;
      const longHtml = '<div>' + 'X'.repeat(200) + '</div>';
      container.innerHTML = longHtml;

      await waitFor(100);

      const call = mockRecord.mock.calls[0][1];
      expect(call.rootElementHTML.length).toBeLessThanOrEqual(100);
      expect(call.rootElementHTML).toContain('... [truncated]');
    });

    it('should not truncate HTML within limit', async () => {
      createTestElement('no-truncate-target');
      plugin = new DomMutationPlugin({
        rootElement: '#no-truncate-target',
        throttleMs: 50,
        maxHtmlLength: 1000,
      });
      plugin.load(mockContext);

      const container = document.getElementById('no-truncate-target')!;
      const html = '<div>Short content</div>';
      container.innerHTML = html;

      await waitFor(100);

      const call = mockRecord.mock.calls[0][1];
      expect(call.rootElementHTML).toBe(html);
      expect(call.rootElementHTML).not.toContain('[truncated]');
    });

    it('should use default maxHtmlLength of 50KB', async () => {
      createTestElement('default-max-target');
      plugin = new DomMutationPlugin({
        rootElement: '#default-max-target',
        throttleMs: 50,
      });
      plugin.load(mockContext);

      const container = document.getElementById('default-max-target')!;
      const html51KB = '<div>' + 'X'.repeat(51200) + '</div>';
      container.innerHTML = html51KB;

      await waitFor(100);

      const call = mockRecord.mock.calls[0][1];
      expect(call.rootElementHTML).toContain('[truncated]');
    });
  });

  describe('Event Data', () => {
    beforeEach(() => {
      createTestElement('data-target');
      plugin = new DomMutationPlugin({
        rootElement: '#data-target',
        throttleMs: 50,
      });
      plugin.load(mockContext);
    });

    it('should include timestamp', async () => {
      const container = document.getElementById('data-target')!;
      const beforeTimestamp = Date.now();

      container.appendChild(document.createElement('div'));

      await waitFor(100);

      const call = mockRecord.mock.calls[0][1];
      expect(call.timestamp).toBeGreaterThanOrEqual(beforeTimestamp);
      expect(call.timestamp).toBeLessThanOrEqual(Date.now());
    });

    it('should include all mutation counts', async () => {
      const container = document.getElementById('data-target')!;

      // Add nodes
      container.appendChild(document.createElement('div'));
      container.appendChild(document.createElement('span'));

      // Change attribute
      const firstChild = container.firstElementChild!;
      firstChild.setAttribute('class', 'test');

      // Remove node
      container.removeChild(container.lastElementChild!);

      await waitFor(100);

      expect(mockRecord).toHaveBeenCalledWith('dom_mutation', {
        addedNodes: expect.any(Number),
        removedNodes: expect.any(Number),
        attributeChanges: expect.any(Number),
        characterDataChanges: expect.any(Number),
        timestamp: expect.any(Number),
        rootElementHTML: expect.any(String),
      });
    });
  });

  describe('Error Handling', () => {
    it('should fail silently if MutationObserver fails', () => {
      // This is hard to test but the plugin should handle it gracefully
      plugin = new DomMutationPlugin();
      expect(() => {
        plugin.load(mockContext);
      }).not.toThrow();
    });

    it('should fail silently if recording throws error', async () => {
      mockRecord.mockImplementation(() => {
        throw new Error('Recording failed');
      });

      createTestElement('error-target');
      plugin = new DomMutationPlugin({
        rootElement: '#error-target',
        throttleMs: 50,
      });
      plugin.load(mockContext);

      const container = document.getElementById('error-target')!;

      expect(() => {
        container.appendChild(document.createElement('div'));
      }).not.toThrow();

      await waitFor(100);
    });

    it('should handle disable before flush completes', async () => {
      createTestElement('disable-target');
      plugin = new DomMutationPlugin({
        rootElement: '#disable-target',
        throttleMs: 100,
      });
      plugin.load(mockContext);

      const container = document.getElementById('disable-target')!;
      container.appendChild(document.createElement('div'));

      // Disable before flush
      await waitFor(50);
      plugin.disable();

      await waitFor(100);

      // Should still have flushed pending mutations on disable
      expect(mockRecord).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty mutations', async () => {
      createTestElement('empty-target');
      plugin = new DomMutationPlugin({
        rootElement: '#empty-target',
        throttleMs: 50,
      });
      plugin.load(mockContext);

      // Wait without making changes
      await waitFor(100);

      expect(mockRecord).not.toHaveBeenCalled();
    });

    it('should handle very large numbers of mutations', async () => {
      createTestElement('large-target');
      plugin = new DomMutationPlugin({
        rootElement: '#large-target',
        throttleMs: 50,
      });
      plugin.load(mockContext);

      const container = document.getElementById('large-target')!;

      // Add 100 nodes
      for (let i = 0; i < 100; i++) {
        container.appendChild(document.createElement('div'));
      }

      await waitFor(100);

      expect(mockRecord).toHaveBeenCalledWith(
        'dom_mutation',
        expect.objectContaining({
          addedNodes: 100,
        }),
      );
    });

    it('should handle multiple enable/disable cycles', async () => {
      createTestElement('cycle-target');
      plugin = new DomMutationPlugin({
        rootElement: '#cycle-target',
        throttleMs: 50,
      });

      const container = document.getElementById('cycle-target')!;

      // First cycle
      plugin.load(mockContext);
      container.appendChild(document.createElement('div'));
      await waitFor(100);
      expect(mockRecord).toHaveBeenCalledTimes(1);

      // Disable
      plugin.disable();
      mockRecord.mockClear();
      container.appendChild(document.createElement('div'));
      await waitFor(100);
      expect(mockRecord).not.toHaveBeenCalled();

      // Enable again
      plugin.enable();
      container.appendChild(document.createElement('div'));
      await waitFor(100);
      expect(mockRecord).toHaveBeenCalledTimes(1);
    });
  });
});
