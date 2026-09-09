import {
  Component,
  ElementRef,
  EmbeddedViewRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  TemplateRef,
  ViewChild,
  ViewContainerRef,
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
import OverrideThemes from '@descope/web-component';

// Node.ELEMENT_NODE, as a literal - the Node global is not guaranteed to exist
// during server-side rendering.
const ELEMENT_NODE = 1;

@Component({
  selector: 'descope[flowId]',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  // The subtree is built imperatively (see ngOnInit), so there is nothing for
  // Angular to hydrate here - it re-renders it on the client instead.
  host: { ngSkipHydration: 'true' },
  // The element is intentionally declared inside an <ng-template> instead of
  // rendered directly. Angular appends an element to the DOM in its creation
  // pass but applies [attr.*] bindings in the later update pass, so a
  // <descope-wc> rendered directly here would be connected - and would run its
  // connectedCallback - before it had a project-id. The custom element reads
  // project-id at that moment, fails, and can never recover, which broke every
  // mount after the first (descope/etc#18415). Building the template by hand
  // lets the bindings run while the nodes are still detached.
  template: `
    <ng-container #wcAnchor></ng-container>
    <ng-template #wcTpl>
      <descope-wc
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
        [attr.send-session-token]="sendSessionToken"
        [attr.debug]="debug"
        [attr.style-id]="styleId"
        [attr.theme-override]="themeOverride"
        [attr.client]="clientString"
        [attr.nonce]="nonceString"
        [attr.dismiss-screen-error-on-input]="dismissScreenErrorOnInput"
        [attr.popup-origin]="popupOrigin"
        [attr.form]="formString"
        [customStorage]="customStorage"
      >
        <ng-content></ng-content>
      </descope-wc>
    </ng-template>
  `
})
export class DescopeComponent implements OnInit, OnChanges, OnDestroy {
  @ViewChild('wcTpl', { static: true })
  private readonly wcTpl!: TemplateRef<unknown>;

  // Anchor inside this component's own view, so the inserted view stays in the
  // component's change-detection tree and Angular destroys it with the component.
  @ViewChild('wcAnchor', { read: ViewContainerRef, static: true })
  private readonly wcAnchor!: ViewContainerRef;

  private wcView?: EmbeddedViewRef<unknown>;

  private isDestroyed = false;

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
  @Input() sendSessionToken: boolean;

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
  @Input() themeOverride: OverrideThemes;
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
    @Inject(PLATFORM_ID) private platformId: object
  ) {
    this.projectId = descopeConfig.projectId;
    this.baseUrl = descopeConfig.baseUrl;
    this.baseStaticUrl = descopeConfig.baseStaticUrl;
    this.baseCdnUrl = descopeConfig.baseCdnUrl;
    this.storeLastAuthenticatedUser = descopeConfig.storeLastAuthenticatedUser;
    this.customStorage = descopeConfig.customStorage;
  }

  async ngOnInit(): Promise<void> {
    // Load the web component before building the element. The order matters:
    // loadWebComponent sets DescopeWc.sdkConfigOverrides, and if something else
    // on the page already imported @descope/web-component then descope-wc is
    // already defined, so the element would initialize the moment it is
    // connected. Connecting it first would let the flow start without the
    // Angular SDK's base headers, persistTokens: false, and beforeRequest hook.
    if (isPlatformBrowser(this.platformId)) {
      await this.loadWebComponent();
    }

    // Built on the server too, so the server-rendered markup keeps containing
    // descope-wc as it did before. ngSkipHydration means the client re-renders
    // this subtree anyway, so the server copy only serves the first paint.
    this.createWebComponent();
  }

  /**
   * Builds the template while its nodes are still detached from the document,
   * applies the attribute bindings, and only then connects the element. This is
   * what guarantees project-id and flow-id are present when the custom element
   * runs its connectedCallback.
   */
  private createWebComponent(): void {
    // ngOnInit awaits the import, so the component can already be destroyed by
    // the time we get here (a route change while the chunk is downloading).
    // Inserting into a destroyed ViewContainerRef would throw, and nothing
    // would ever clean the view up.
    if (this.isDestroyed || this.wcView) return;

    // createEmbeddedView builds the nodes without putting them in the document,
    // so the element is not connected yet and its connectedCallback has not run.
    const view = this.wcTpl.createEmbeddedView(undefined);
    // Apply the [attr.*] bindings while the nodes are still detached.
    view.detectChanges();
    this.wcView = view;

    // rootNodes can include whitespace text nodes, so find the element. The
    // nodeType is compared to a literal rather than Node.ELEMENT_NODE because
    // this also runs during SSR, where the Node global may not exist.
    this.webComponent = view.rootNodes.find(
      (node: { nodeType: number }) => node.nodeType === ELEMENT_NODE
    ) as DescopeWebComponent | undefined;

    // Inserting connects the element - its connectedCallback runs here, with
    // every attribute already set.
    this.wcAnchor.insert(view);

    if (!this.webComponent) return;

    this.setupNonAttributeProperties();
    this.setupEventListeners();
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
      // eslint-disable-next-line no-console
      console.error('Failed to load Descope web component:', error);
    }
  }

  ngOnDestroy(): void {
    // Guards the ngOnInit race - the continuation can still be pending here.
    this.isDestroyed = true;

    // wcAnchor owns the view, so Angular would tear it down anyway - but when a
    // parent view is going away Angular skips removing the individual nodes, and
    // then the element never disconnects. Destroying it here takes the element
    // out of the DOM, so the web component's disconnectedCallback runs and drops
    // its window listeners and flow-state subscriptions.
    this.wcView?.destroy();
    this.wcView = undefined;
    this.webComponent = undefined;
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
