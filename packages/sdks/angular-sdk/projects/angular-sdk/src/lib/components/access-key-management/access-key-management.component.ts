import {
  Component,
  ElementRef,
  Input,
  Output,
  EventEmitter,
  CUSTOM_ELEMENTS_SCHEMA,
  Inject,
  PLATFORM_ID
} from '@angular/core';
import { DescopeAuthConfig, ILogger } from '../../types/types';
import { BaseLazyWidgetComponent } from '../../base/base-lazy-widget.component';

@Component({
  selector: 'access-key-management[tenant]',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: ''
})
export class AccessKeyManagementComponent extends BaseLazyWidgetComponent {
  projectId: string;
  baseUrl?: string;
  baseStaticUrl?: string;
  baseCdnUrl?: string;
  @Input() tenant: string;
  @Input() widgetId: string;

  @Input() theme: 'light' | 'dark' | 'os';
  @Input() debug: boolean;
  @Input() logger: ILogger;
  @Input() styleId: string;

  @Output() ready: EventEmitter<void> = new EventEmitter<void>();

  constructor(
    elementRef: ElementRef,
    descopeConfig: DescopeAuthConfig,
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
      const WidgetModule = await import(
        '@descope/access-key-management-widget'
      );
      const DescopeAccessKeyManagementWidget = WidgetModule.default;
      return new DescopeAccessKeyManagementWidget() as unknown as HTMLElement;
    } catch (error) {
      console.error('Failed to load Access Key Management widget:', error);
      return null;
    }
  }

  protected setupWebComponent() {
    if (!this.webComponent) return;

    this.webComponent.setAttribute('project-id', this.projectId);
    this.webComponent.setAttribute('tenant', this.tenant);
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

    if (this.logger) {
      (this.webComponent as any).logger = this.logger;
    }
  }

  protected setupEventListeners(): void {
    if (!this.webComponent) return;

    if (this.ready) {
      this.webComponent.addEventListener('ready', () => {
        this.ready?.emit();
      });
    }
  }
}
