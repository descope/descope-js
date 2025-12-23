import {
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnInit,
  Output,
  EventEmitter,
  AfterViewInit,
  CUSTOM_ELEMENTS_SCHEMA,
  Inject,
  PLATFORM_ID
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { DescopeAuthConfig, ILogger } from '../../types/types';

@Component({
  selector: 'user-management[tenant]',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: ''
})
export class UserManagementComponent
  implements OnInit, OnChanges, AfterViewInit
{
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

  private webComponent?: HTMLElement;
  private isWidgetLoaded = false;

  constructor(
    private elementRef: ElementRef,
    descopeConfig: DescopeAuthConfig,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.projectId = descopeConfig.projectId;
    this.baseUrl = descopeConfig.baseUrl;
    this.baseStaticUrl = descopeConfig.baseStaticUrl;
    this.baseCdnUrl = descopeConfig.baseCdnUrl;
  }

  async ngOnInit() {
    // Only load widget in browser environment
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    await this.loadWidget();
    this.setupWebComponent();
    if (this.webComponent) {
      this.elementRef.nativeElement.appendChild(this.webComponent);
    }
  }

  private async loadWidget(): Promise<void> {
    if (this.isWidgetLoaded) {
      return;
    }

    try {
      const WidgetModule = await import('@descope/user-management-widget');
      const DescopeUserManagementWidget = WidgetModule.default;
      this.webComponent =
        new DescopeUserManagementWidget() as unknown as HTMLElement;
      this.isWidgetLoaded = true;
    } catch (error) {
      console.error('Failed to load User Management widget:', error);
    }
  }

  ngOnChanges(): void {
    if (this.webComponent) {
      this.setupWebComponent();
    }
  }

  ngAfterViewInit(): void {
    this.setupEventListeners();
  }

  private setupWebComponent() {
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
    if (this.styleId) {
      this.webComponent.setAttribute('style-id', this.styleId);
    }

    if (this.logger) {
      (this.webComponent as any).logger = this.logger;
    }
  }

  private setupEventListeners(): void {
    if (!this.webComponent) return;

    if (this.ready) {
      this.webComponent.addEventListener('ready', () => {
        this.ready?.emit();
      });
    }
  }
}
