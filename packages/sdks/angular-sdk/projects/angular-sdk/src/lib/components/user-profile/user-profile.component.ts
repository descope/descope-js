import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  Inject,
  PLATFORM_ID
} from '@angular/core';
import { DescopeAuthConfig, ILogger } from '../../types/types';
import { DescopeAuthService } from '../../services/descope-auth.service';
import { BaseLazyWidgetComponent } from '../../base/base-lazy-widget.component';

@Component({
  selector: 'user-profile',
  standalone: true,
  template: ''
})
export class UserProfileComponent extends BaseLazyWidgetComponent {
  projectId: string;
  baseUrl?: string;
  baseStaticUrl?: string;
  baseCdnUrl?: string;
  @Input() widgetId: string;

  @Input() theme: 'light' | 'dark' | 'os';
  @Input() debug: boolean;
  @Input() logger: ILogger;
  @Input() styleId: string;

  @Output() logout: EventEmitter<CustomEvent> = new EventEmitter<CustomEvent>();

  @Output() ready: EventEmitter<void> = new EventEmitter<void>();

  constructor(
    elementRef: ElementRef,
    descopeConfig: DescopeAuthConfig,
    private descopeAuthService: DescopeAuthService,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    super(elementRef, platformId);
    this.projectId = descopeConfig.projectId;
    this.baseUrl = descopeConfig.baseUrl;
    this.baseStaticUrl = descopeConfig.baseStaticUrl;
    this.baseCdnUrl = descopeConfig.baseCdnUrl;
  }

  protected async loadWidget(): Promise<HTMLElement | null> {
    try {
      const WidgetModule = await import('@descope/user-profile-widget');
      const DescopeUserProfileWidget = WidgetModule.default;
      return new DescopeUserProfileWidget() as unknown as HTMLElement;
    } catch (error) {
      console.error('Failed to load User Profile widget:', error);
      return null;
    }
  }

  protected setupWebComponent() {
    if (!this.webComponent) return;

    this.webComponent.setAttribute('project-id', this.projectId);
    this.webComponent.setAttribute('widget-id', this.widgetId);
    if (this.baseUrl) {
      this.webComponent.setAttribute('base-url', this.baseUrl);
    }
    if (this.baseStaticUrl) {
      this.webComponent.setAttribute('base-static-url', this.baseStaticUrl);
    }
    if (this.baseCdnUrl) {
      this.webComponent.setAttribute('base-cdn-url', this.baseCdnUrl);
    }
    if (this.theme) {
      this.webComponent.setAttribute('theme', this.theme);
    }
    if (this.debug) {
      this.webComponent.setAttribute('debug', this.debug.toString());
    }
    if (this.styleId) {
      this.webComponent.setAttribute('style-id', this.styleId);
    }

    if (this.logger) {
      (this.webComponent as any).logger = this.logger;
    }
  }

  protected setupEventListeners(): void {
    if (!this.webComponent) return;

    this.webComponent.addEventListener('logout', (e: Event) => {
      this.logout?.emit(e as CustomEvent);
      this.descopeAuthService.setSession('');
      this.descopeAuthService.setIsAuthenticated(false);
      this.descopeAuthService.setUser(null);
    });
    if (this.ready) {
      this.webComponent.addEventListener('ready', () => {
        this.ready?.emit();
      });
    }
  }
}
