import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  ViewChild,
  AfterViewInit,
  CUSTOM_ELEMENTS_SCHEMA,
  Inject,
  PLATFORM_ID
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { DescopeAuthService } from '../../services/descope-auth.service';
import { from } from 'rxjs';
import { baseHeaders } from '../../utils/constants';
import { DescopeAuthConfig, ILogger } from '../../types/types';

// Use "import type" to import only the TypeScript type information.
// This is safe for SSR because it's completely erased at compile time and generates no runtime import.
import type DescopeWebComponent from '@descope/web-component';
import type { CustomStorage } from '@descope/web-component';

@Component({
  selector: 'descope[flowId]',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <descope-wc
      #descopeWc
      [attr.project-id]="projectId"
      [attr.flow-id]="flowId"
      [attr.base-url]="baseUrl"
      [attr.base-static-url]="baseStaticUrl"
      [attr.base-cdn-url]="baseCdnUrl"
      [attr.store-last-authenticated-user]="storeLastAuthenticatedUser"
      [attr.theme]="theme"
      [attr.locale]="locale"
      [attr.tenant]="tenant"
      [attr.telemetry-key]="telemetryKey"
      [attr.redirect-url]="redirectUrl"
      [attr.auto-focus]="autoFocus"
      [attr.validate-on-blur]="validateOnBlur"
      [attr.restart-on-error]="restartOnError"
      [attr.debug]="debug"
      [attr.style-id]="styleId"
      [attr.client]="clientString"
      [attr.nonce]="nonceString"
      [attr.dismiss-screen-error-on-input]="dismissScreenErrorOnInput"
      [attr.popup-origin]="popupOrigin"
      [attr.form]="formString"
      [customStorage]="customStorage"
    >
      <ng-content></ng-content>
    </descope-wc>
  `
})
export class DescopeComponent implements OnInit, OnChanges, AfterViewInit {
  @ViewChild('descopeWc')
  private readonly descopeWc!: ElementRef<DescopeWebComponent>;

  get clientString(): string | undefined {
    if (!this.client) return undefined;
    try {
      return JSON.stringify(this.client);
    } catch {
      return undefined;
    }
  }

  get nonceString(): string | undefined {
    if (!this.nonce) return undefined;
    return typeof this.nonce === 'string' ? this.nonce : undefined;
  }

  get formString(): string | undefined {
    if (!this.form) return undefined;
    try {
      return JSON.stringify(this.form);
    } catch {
      return undefined;
    }
  }

  projectId!: string;
  baseUrl?: string;
  baseStaticUrl?: string;
  baseCdnUrl?: string;
  storeLastAuthenticatedUser?: boolean;
  customStorage?: CustomStorage;
  @Input() flowId!: string;

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
    context: Record<string, any>,
    next: (
      interactionId: string,
      form: Record<string, any>
    ) => Promise<unknown>,
    ref: HTMLElement
  ) => boolean | Promise<boolean>;
  @Input() client: Record<string, any>;
  @Input() nonce: string;
  @Input() dismissScreenErrorOnInput: boolean;
  @Input() form: Record<string, any>;
  @Input() logger: ILogger;
  @Input() styleId: string;
  @Input() popupOrigin: string;

  @Output() success: EventEmitter<CustomEvent> =
    new EventEmitter<CustomEvent>();
  @Output() error: EventEmitter<CustomEvent> = new EventEmitter<CustomEvent>();
  @Output() ready: EventEmitter<void> = new EventEmitter<void>();

  private webComponent?: DescopeWebComponent;
  private isWebComponentLoaded = false;

  constructor(
    private elementRef: ElementRef,
    private authService: DescopeAuthService,
    descopeConfig: DescopeAuthConfig,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.projectId = descopeConfig.projectId;
    this.baseUrl = descopeConfig.baseUrl;
    this.baseStaticUrl = descopeConfig.baseStaticUrl;
    this.baseCdnUrl = descopeConfig.baseCdnUrl;
    this.storeLastAuthenticatedUser = descopeConfig.storeLastAuthenticatedUser;
    this.customStorage = descopeConfig.customStorage;
  }

  async ngOnInit(): Promise<void> {
    // Only load web component in browser environment
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    await this.loadWebComponent();
  }

  private async loadWebComponent(): Promise<void> {
    if (this.isWebComponentLoaded) {
      return;
    }

    try {
      // Dynamically import the web component only in browser context
      const DescopeWcModule = await import('@descope/web-component');
      const DescopeWc = DescopeWcModule.default;
      const sdk = this.authService.descopeSdk;

      DescopeWc.sdkConfigOverrides = {
        // Overrides the web-component's base headers to indicate usage via the Angular SDK
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

      this.isWebComponentLoaded = true;
    } catch (error) {
      console.error('Failed to load Descope web component:', error);
    }
  }

  ngAfterViewInit(): void {
    if (!this.descopeWc?.nativeElement) return;

    this.webComponent = this.descopeWc.nativeElement;
    this.setupNonAttributeProperties();
    this.setupEventListeners();
  }

  ngOnChanges(): void {
    if (this.webComponent) {
      this.setupNonAttributeProperties();
    }
  }

  private setupNonAttributeProperties(): void {
    if (!this.webComponent) return;

    // Handle non-attribute properties
    if (this.errorTransformer) {
      this.webComponent.errorTransformer = this.errorTransformer;
    }

    if (this.onScreenUpdate) {
      this.webComponent.onScreenUpdate = this.onScreenUpdate;
    }

    if (this.logger) {
      this.webComponent.logger = this.logger;
    }
  }

  private setupEventListeners(): void {
    if (!this.webComponent) return;

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
