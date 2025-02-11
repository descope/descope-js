import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output
} from '@angular/core';
import DescopeWebComponent from '@descope/web-component';
import DescopeWc, { ILogger } from '@descope/web-component';
import { DescopeAuthService } from '../../services/descope-auth.service';
import { from } from 'rxjs';
import { baseHeaders } from '../../utils/constants';
import { DescopeAuthConfig } from '../../types/types';

@Component({
  selector: 'descope[flowId]',
  standalone: true,
  template: ''
})
export class DescopeComponent implements OnInit, OnChanges {
  projectId: string;
  baseUrl?: string;
  baseStaticUrl?: string;
  baseCdnUrl?: string;
  storeLastAuthenticatedUser?: boolean;
  @Input() flowId: string;

  @Input() locale: string;
  @Input() theme: 'light' | 'dark' | 'os';
  @Input() tenant: string;
  @Input() telemetryKey: string;
  @Input() redirectUrl: string;
  @Input() autoFocus: true | false | 'skipFirstScreen';
  @Input() validateOnBlur: boolean;
  @Input() restartOnError: boolean;

  @Input() debug: boolean;
  @Input() errorTransformer: (error: { text: string; type: string }) => string;
  @Input() onScreenUpdate: (
    screenName: string,
    state: Record<string, any>,
    next: (
      interactionId: string,
      form: Record<string, any>
    ) => Promise<unknown>,
    ref: HTMLElement
  ) => boolean | Promise<boolean>;
  @Input() client: Record<string, any>;
  @Input() form: Record<string, any>;
  @Input() logger: ILogger;
  @Input() styleId: string;

  @Output() success: EventEmitter<CustomEvent> =
    new EventEmitter<CustomEvent>();
  @Output() error: EventEmitter<CustomEvent> = new EventEmitter<CustomEvent>();
  @Output() ready: EventEmitter<void> = new EventEmitter<void>();

  private readonly webComponent: DescopeWebComponent =
    new DescopeWebComponent();

  constructor(
    private elementRef: ElementRef,
    private authService: DescopeAuthService,
    descopeConfig: DescopeAuthConfig
  ) {
    this.projectId = descopeConfig.projectId;
    this.baseUrl = descopeConfig.baseUrl;
    this.baseStaticUrl = descopeConfig.baseStaticUrl;
    this.baseCdnUrl = descopeConfig.baseCdnUrl;
    this.storeLastAuthenticatedUser = descopeConfig.storeLastAuthenticatedUser;
  }

  ngOnInit() {
    const sdk = this.authService.descopeSdk; // Capture the class context in a variable
    const WebComponent: any = customElements?.get('descope-wc') || DescopeWc;

    WebComponent.sdkConfigOverrides = {
      // Overrides the web-component's base headers to indicate usage via the React SDK
      baseHeaders,
      // Disables token persistence within the web-component to delegate token management
      // to the global SDK hooks. This ensures token handling aligns with the SDK's configuration,
      // and web-component requests leverage the global SDK's beforeRequest hooks for consistency
      persistTokens: false,
      hooks: {
        get beforeRequest() {
          // Retrieves the beforeRequest hook from the global SDK, which is initialized
          // within the AuthProvider using the desired configuration. This approach ensures
          // the web-component utilizes the same beforeRequest hooks as the global SDK
          return sdk.httpClient.hooks?.beforeRequest;
        },
        set beforeRequest(_) {
          // The empty setter prevents runtime errors when attempts are made to assign a value to 'beforeRequest'.
          // JavaScript objects default to having both getters and setters
        }
      }
    };
    this.setupWebComponent();
    this.elementRef.nativeElement.appendChild(this.webComponent);
  }

  ngOnChanges(): void {
    this.setupWebComponent();
  }

  private setupWebComponent() {
    this.webComponent.setAttribute('project-id', this.projectId);
    this.webComponent.setAttribute('flow-id', this.flowId);

    if (this.baseUrl) {
      this.webComponent.setAttribute('base-url', this.baseUrl);
    }
    if (this.baseStaticUrl) {
      this.webComponent.setAttribute('base-static-url', this.baseStaticUrl);
    }
    if (this.baseCdnUrl) {
      this.webComponent.setAttribute('base-cdn-url', this.baseCdnUrl);
    }
    if (this.storeLastAuthenticatedUser) {
      this.webComponent.setAttribute(
        'store-last-authenticated-user',
        this.storeLastAuthenticatedUser.toString()
      );
    }
    if (this.locale) {
      this.webComponent.setAttribute('locale', this.locale);
    }
    if (this.theme) {
      this.webComponent.setAttribute('theme', this.theme);
    }
    if (this.tenant) {
      this.webComponent.setAttribute('tenant', this.tenant);
    }
    if (this.telemetryKey) {
      this.webComponent.setAttribute('telemetryKey', this.telemetryKey);
    }
    if (this.redirectUrl) {
      this.webComponent.setAttribute('redirect-url', this.redirectUrl);
    }
    if (this.autoFocus) {
      this.webComponent.setAttribute('auto-focus', this.autoFocus.toString());
    }
    if (this.validateOnBlur) {
      this.webComponent.setAttribute(
        'validate-on-blur',
        this.autoFocus.toString()
      );
    }
    if (this.restartOnError) {
      this.webComponent.setAttribute(
        'restart-on-error',
        this.autoFocus.toString()
      );
    }
    if (this.debug) {
      this.webComponent.setAttribute('debug', this.debug.toString());
    }
    if (this.styleId) {
      this.webComponent.setAttribute('style-id', this.styleId);
    }

    if (this.errorTransformer) {
      this.webComponent.errorTransformer = this.errorTransformer;
    }

    if (this.onScreenUpdate) {
      this.webComponent.onScreenUpdate = this.onScreenUpdate;
    }

    if (this.client) {
      this.webComponent.setAttribute('client', JSON.stringify(this.client));
    }

    if (this.form) {
      this.webComponent.setAttribute('form', JSON.stringify(this.form));
    }

    if (this.logger) {
      this.webComponent.logger = this.logger;
    }

    this.webComponent.addEventListener('success', (e: Event) => {
      from(
        this.authService.descopeSdk.httpClient.hooks?.afterRequest!(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          {} as any,
          new Response(JSON.stringify((e as CustomEvent).detail))
        ) as Promise<unknown>
      ).subscribe(() => {
        if (this.success) {
          this.success?.emit(e as CustomEvent);
        }
      });
    });

    if (this.error) {
      this.webComponent.addEventListener('error', (e: Event) => {
        this.error?.emit(e as CustomEvent);
      });
    }

    if (this.ready) {
      this.webComponent.addEventListener('ready', () => {
        this.ready?.emit();
      });
    }
  }
}
