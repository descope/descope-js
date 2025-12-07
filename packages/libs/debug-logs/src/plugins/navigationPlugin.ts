import type { Plugin, PluginContext } from 'aws-rum-web';

/**
 * Navigation Plugin for AWS RUM
 * Records SPA navigation events (pushState, replaceState, popstate, hashchange)
 */
export class NavigationPlugin implements Plugin {
  private context!: PluginContext;
  private enabled = false;
  private readonly id = 'navigation-plugin';

  private originalPushState = history.pushState;
  private originalReplaceState = history.replaceState;
  private currentUrl = '';
  private eventHandlers: Array<{ type: string; handler: EventListener }> = [];

  load(context: PluginContext): void {
    this.context = context;
    this.currentUrl = window.location.href;
    this.enable();
  }

  enable(): void {
    if (this.enabled) return;
    this.enabled = true;

    // Intercept pushState
    history.pushState = (...args: Parameters<typeof history.pushState>) => {
      const previousUrl = this.currentUrl;
      this.originalPushState.apply(history, args);
      this.currentUrl = window.location.href;
      this.recordNavigation(previousUrl, this.currentUrl, 'pushState');
    };

    // Intercept replaceState
    history.replaceState = (
      ...args: Parameters<typeof history.replaceState>
    ) => {
      const previousUrl = this.currentUrl;
      this.originalReplaceState.apply(history, args);
      this.currentUrl = window.location.href;
      this.recordNavigation(previousUrl, this.currentUrl, 'replaceState');
    };

    // Listen to popstate (back/forward)
    const handlePopState = () => {
      const previousUrl = this.currentUrl;
      this.currentUrl = window.location.href;
      this.recordNavigation(previousUrl, this.currentUrl, 'popstate');
    };
    window.addEventListener('popstate', handlePopState);
    this.eventHandlers.push({ type: 'popstate', handler: handlePopState });

    // Listen to hashchange
    const handleHashChange = () => {
      const previousUrl = this.currentUrl;
      this.currentUrl = window.location.href;
      this.recordNavigation(previousUrl, this.currentUrl, 'hashchange');
    };
    window.addEventListener('hashchange', handleHashChange);
    this.eventHandlers.push({ type: 'hashchange', handler: handleHashChange });
  }

  disable(): void {
    if (!this.enabled) return;
    this.enabled = false;

    // Restore original methods
    history.pushState = this.originalPushState;
    history.replaceState = this.originalReplaceState;

    // Remove event listeners
    this.eventHandlers.forEach(({ type, handler }) => {
      window.removeEventListener(type, handler);
    });
    this.eventHandlers = [];
  }

  getPluginId(): string {
    return this.id;
  }

  private recordNavigation(from: string, to: string, type: string): void {
    try {
      this.context.record('navigation', {
        type,
        from,
        to,
        timestamp: Date.now(),
      });
    } catch (error) {
      // Fail silently
    }
  }
}
