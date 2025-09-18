import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  AfterViewInit
} from '@angular/core';
import DescopeApplicationsPortalWidget from '@descope/applications-portal-widget';
import { ILogger } from '@descope/web-component';
import { DescopeAuthConfig } from '../../types/types';

@Component({
  selector: 'applications-portal',
  standalone: true,
  template: ''
})
export class ApplicationsPortalComponent
  implements OnInit, OnChanges, AfterViewInit
{
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

  private readonly webComponent = new DescopeApplicationsPortalWidget();

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
    if (this.styleId) {
      this.webComponent.setAttribute('style-id', this.styleId);
    }
  }

  private setupEventListeners(): void {
    if (this.logout) {
      this.webComponent.addEventListener('logout', (e: Event) => {
        this.logout?.emit(e as CustomEvent);
      });
    }
    if (this.ready) {
      this.webComponent.addEventListener('ready', () => {
        this.ready?.emit();
      });
    }
  }
}
