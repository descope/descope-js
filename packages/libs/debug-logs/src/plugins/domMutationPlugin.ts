import type { Plugin, PluginContext } from 'aws-rum-web';

export interface DomMutationPluginConfig {
  rootElement?: string | HTMLElement;
  throttleMs?: number;
}

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
  private config: DomMutationPluginConfig;
  private rootElement: HTMLElement = document.body;

  constructor(config: DomMutationPluginConfig = {}) {
    this.config = config;
    this.throttleMs = config.throttleMs || 100;
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
    this.enabled = false;

    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
      this.flushTimeout = null;
    }

    // Flush any pending mutations
    this.flushMutations();
  }

  getPluginId(): string {
    return this.id;
  }

  private scheduleMutationFlush(mutations: MutationRecord[]): void {
    this.pendingMutations.push(...mutations);

    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
    }

    this.flushTimeout = setTimeout(() => {
      this.flushMutations();
    }, this.throttleMs);
  }

  private flushMutations(): void {
    if (this.pendingMutations.length === 0) return;

    try {
      // Aggregate mutation data
      const summary = {
        addedNodes: this.pendingMutations.reduce(
          (sum, m) => sum + m.addedNodes.length,
          0,
        ),
        removedNodes: this.pendingMutations.reduce(
          (sum, m) => sum + m.removedNodes.length,
          0,
        ),
        attributeChanges: this.pendingMutations.filter(
          (m) => m.type === 'attributes',
        ).length,
        characterDataChanges: this.pendingMutations.filter(
          (m) => m.type === 'characterData',
        ).length,
        timestamp: Date.now(),
        rootElementHTML: this.rootElement.outerHTML,
      };

      this.context.record('dom_mutation', summary);
    } catch (error) {
      // Fail silently
    }

    this.pendingMutations = [];
    this.flushTimeout = null;
  }
}
