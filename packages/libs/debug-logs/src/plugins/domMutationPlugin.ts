import type { Plugin, PluginContext } from 'aws-rum-web';

export interface DomMutationPluginConfig {
  rootElement?: string | HTMLElement;
  throttleMs?: number;
  maxHtmlLength?: number;
}

// AWS RUM has a 256KB limit for the entire event payload
// We'll limit the HTML snapshot to 50KB to leave room for other data
const DEFAULT_MAX_HTML_LENGTH = 51200; // 50KB

/**
 * DOM Mutation Plugin for AWS RUM
 * Records aggregated DOM mutations using MutationObserver
 */
export class DomMutationPlugin implements Plugin {
  private context!: PluginContext;
  private enabled = false;
  private readonly id = 'dom-mutation-plugin';

  private observer: MutationObserver | null = null;
  private pendingMutations: MutationRecord[] = [];
  private flushTimeout: ReturnType<typeof setTimeout> | null = null;
  private throttleMs: number;
  private maxHtmlLength: number;
  private config: DomMutationPluginConfig;
  private rootElement: HTMLElement = document.body;

  constructor(config: DomMutationPluginConfig = {}) {
    this.config = config;
    this.throttleMs = config.throttleMs || 100;
    this.maxHtmlLength = config.maxHtmlLength ?? DEFAULT_MAX_HTML_LENGTH;
  }

  load(context: PluginContext): void {
    this.context = context;
    this.enable();
  }

  enable(): void {
    if (this.enabled) return;
    this.enabled = true;

    // Determine root element for observation
    let observeTarget: HTMLElement = document.body;

    if (this.config.rootElement) {
      if (typeof this.config.rootElement === 'string') {
        // It's a selector string
        const element = document.querySelector<HTMLElement>(
          this.config.rootElement,
        );
        if (element) {
          observeTarget = element;
        }
      } else {
        // It's an HTMLElement
        observeTarget = this.config.rootElement;
      }
    }

    this.rootElement = observeTarget;

    try {
      this.observer = new MutationObserver((mutations) => {
        // Check enabled flag FIRST - this prevents processing of browser-queued
        // callbacks that fire after disable() has been called
        if (!this.enabled) return;
        this.scheduleMutationFlush(mutations);
      });

      this.observer.observe(this.rootElement, {
        childList: true,
        attributes: true,
        characterData: true,
        subtree: true,
        attributeOldValue: false,
        characterDataOldValue: false,
      });
    } catch (error) {
      // Fail silently if MutationObserver fails
      console.debug('DOM mutation plugin failed to start:', error);
    }
  }

  disable(): void {
    if (!this.enabled) return;

    // Set enabled = false FIRST so that any browser-queued MutationObserver
    // callbacks that fire after this point will be rejected by the check
    // in the MutationObserver callback
    this.enabled = false;

    // Clear any scheduled flush timeout to prevent it from recording later
    // This must happen BEFORE we capture pending mutations to avoid race
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
      this.flushTimeout = null;
    }

    // Disconnect observer BEFORE flushing to stop new mutations from being added
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    // Now safely flush any pending mutations that were already queued
    // Make a copy and clear the array atomically to prevent concurrent access
    const mutationsToFlush = [...this.pendingMutations];
    this.pendingMutations = [];

    // Record mutations if there are any (pass explicitly so it bypasses enabled check)
    if (mutationsToFlush.length > 0) {
      this.recordPendingMutations(mutationsToFlush);
    }
  }

  getPluginId(): string {
    return this.id;
  }

  private scheduleMutationFlush(mutations: MutationRecord[]): void {
    // Don't schedule if plugin is disabled - check FIRST before pushing
    if (!this.enabled) return;

    this.pendingMutations.push(...mutations);

    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
    }

    this.flushTimeout = setTimeout(() => {
      // Double-check in case plugin was disabled while timeout was pending
      if (!this.enabled) return;
      this.flushMutations();
    }, this.throttleMs);
  }
  private flushMutations(): void {
    // Don't flush if plugin is disabled OR if observer has been disconnected
    if (!this.enabled || !this.observer) return;

    this.recordPendingMutations();
    this.flushTimeout = null;
  }

  /**
   * Records mutations.
   * @param mutations - Mutations to record. If not provided, uses this.pendingMutations
   */
  private recordPendingMutations(mutations?: MutationRecord[]): void {
    // If mutations are explicitly provided (e.g., during disable), record them
    // even if plugin is disabled. Otherwise, check enabled status.
    if (!mutations && !this.enabled) return;

    const mutationsToRecord = mutations || this.pendingMutations;
    if (mutationsToRecord.length === 0) return;

    try {
      // Get HTML and truncate if needed
      let html = this.rootElement.innerHTML;
      if (html.length > this.maxHtmlLength) {
        html = html.substring(0, this.maxHtmlLength - 20) + '... [truncated]';
      }

      // Aggregate mutation data
      const summary = {
        addedNodes: mutationsToRecord.reduce(
          (sum, m) => sum + m.addedNodes.length,
          0,
        ),
        removedNodes: mutationsToRecord.reduce(
          (sum, m) => sum + m.removedNodes.length,
          0,
        ),
        attributeChanges: mutationsToRecord.filter(
          (m) => m.type === 'attributes',
        ).length,
        characterDataChanges: mutationsToRecord.filter(
          (m) => m.type === 'characterData',
        ).length,
        timestamp: Date.now(),
        rootElementHTML: html,
      };

      this.context.record('dom_mutation', summary);
    } catch (error) {
      // Fail silently
    }

    // Only clear the instance array if we didn't use an explicit parameter
    if (!mutations) {
      this.pendingMutations = [];
    }
  }
}
