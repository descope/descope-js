import {
  AfterViewInit,
  Directive,
  ElementRef,
  Inject,
  OnChanges,
  OnInit,
  PLATFORM_ID
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Abstract base class for widget components that need to be lazily loaded
 * with SSR support. This class handles the common lifecycle patterns:
 * - Browser detection for SSR compatibility
 * - Lazy loading of widgets
 * - DOM manipulation (appending to element)
 * - Lifecycle coordination between loading, setup, and event listeners
 *
 * Derived components must implement:
 * - loadWidget(): Dynamic import and instantiation of the specific widget
 * - setupWebComponent(): Configure attributes and properties on the widget
 * - setupEventListeners(): Attach event listeners to the widget
 */
@Directive()
export abstract class BaseLazyWidgetComponent
  implements OnInit, OnChanges, AfterViewInit
{
  protected webComponent?: HTMLElement;

  constructor(
    protected elementRef: ElementRef,
    @Inject(PLATFORM_ID) protected platformId: Object
  ) {}

  async ngOnInit(): Promise<void> {
    // Only load widget in browser environment
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const widget = await this.loadWidget();
    if (widget) {
      this.webComponent = widget;
      this.setupWebComponent();
      this.elementRef.nativeElement.appendChild(this.webComponent);
      // Set up event listeners after the widget is loaded and appended
      this.setupEventListeners();
    }
  }

  ngOnChanges(): void {
    if (this.webComponent) {
      this.setupWebComponent();
    }
  }

  ngAfterViewInit(): void {
    // Event listeners are now set up in ngOnInit after widget loading
  }

  /**
   * Load the widget module dynamically. This method should:
   * 1. Dynamically import the widget module
   * 2. Instantiate the widget
   * 3. Return the widget as an HTMLElement
   * 4. Handle errors appropriately
   *
   * @returns The instantiated widget element, or null if loading failed
   */
  protected abstract loadWidget(): Promise<HTMLElement | null>;

  /**
   * Configure the web component by setting attributes and properties.
   * This is called after the widget is loaded and whenever inputs change.
   */
  protected abstract setupWebComponent(): void;

  /**
   * Attach event listeners to the web component.
   * This is called once after the view is initialized.
   */
  protected abstract setupEventListeners(): void;
}
