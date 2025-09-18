import {
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnInit,
  Output,
  EventEmitter,
  AfterViewInit,
  CUSTOM_ELEMENTS_SCHEMA
} from '@angular/core';
import DescopeAccessKeyManagementWidget from '@descope/access-key-management-widget';
import { ILogger } from '@descope/web-component';
import { DescopeAuthConfig } from '../../types/types';

@Component({
  selector: 'access-key-management[tenant]',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: ''
})
export class AccessKeyManagementComponent
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

  private readonly webComponent = new DescopeAccessKeyManagementWidget();

  constructor(
    private elementRef: ElementRef,
    descopeConfig: DescopeAuthConfig
  ) {
    this.projectId = descopeConfig.projectId;
    this.baseUrl = descopeConfig.baseUrl;
    this.baseStaticUrl = descopeConfig.baseStaticUrl;
    this.baseCdnUrl = descopeConfig.baseCdnUrl;
  }

  ngOnInit() {
    this.setupWebComponent();
    this.elementRef.nativeElement.appendChild(this.webComponent);
  }

  ngOnChanges(): void {
    this.setupWebComponent();
  }

  ngAfterViewInit(): void {
    this.setupEventListeners();
  }

  private setupWebComponent() {
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

  private setupEventListeners(): void {
    if (this.ready) {
      this.webComponent.addEventListener('ready', () => {
        this.ready?.emit();
      });
    }
  }
}
