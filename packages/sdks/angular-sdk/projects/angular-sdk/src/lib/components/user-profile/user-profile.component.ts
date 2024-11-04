import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output
} from '@angular/core';
import DescopeUserProfileWidget from '@descope/user-profile-widget';
import { ILogger } from '@descope/web-component';
import { DescopeAuthConfig } from '../../types/types';

@Component({
  selector: 'user-profile',
  standalone: true,
  template: ''
})
export class UserProfileComponent implements OnInit, OnChanges {
  projectId: string;
  baseUrl?: string;
  baseStaticUrl?: string;
  @Input() widgetId: string;

  @Input() theme: 'light' | 'dark' | 'os';
  @Input() debug: boolean;
  @Input() logger: ILogger;
  @Input() styleId: string;

  @Output() logout: EventEmitter<CustomEvent> = new EventEmitter<CustomEvent>();

  private readonly webComponent = new DescopeUserProfileWidget();

  constructor(
    private elementRef: ElementRef,
    descopeConfig: DescopeAuthConfig
  ) {
    this.projectId = descopeConfig.projectId;
    this.baseUrl = descopeConfig.baseUrl;
    this.baseStaticUrl = descopeConfig.baseStaticUrl;
  }

  ngOnInit() {
    this.setupWebComponent();
    this.elementRef.nativeElement.appendChild(this.webComponent);
  }

  ngOnChanges(): void {
    this.setupWebComponent();
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

    if (this.logout) {
      this.webComponent.addEventListener('logout', (e: Event) => {
        this.logout?.emit(e as CustomEvent);
      });
    }
  }
}
