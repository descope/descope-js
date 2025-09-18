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
import DescopeUserProfileWidget from '@descope/user-profile-widget';
import { ILogger } from '@descope/web-component';
import { DescopeAuthConfig } from '../../types/types';
import { DescopeAuthService } from '../../services/descope-auth.service';

@Component({
  selector: 'user-profile',
  standalone: true,
  template: ''
})
export class UserProfileComponent implements OnInit, OnChanges, AfterViewInit {
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

  private readonly webComponent = new DescopeUserProfileWidget();

  constructor(
    private elementRef: ElementRef,
    descopeConfig: DescopeAuthConfig,
    private descopeAuthService: DescopeAuthService
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
    if (this.styleId) {
      this.webComponent.setAttribute('style-id', this.styleId);
    }

    if (this.logger) {
      (this.webComponent as any).logger = this.logger;
    }
  }

  private setupEventListeners(): void {
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
