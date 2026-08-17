import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import { loggerMixin } from '../loggerMixin';
import { initElementMixin } from '../initElementMixin';
import { applyComponentsState, clearComponentsState } from './applier';

type ComponentsState = Record<string, string>;

const COMPONENTS_STATE_PATH = '/v1/mgmt/widget/components-state';

// Minimal client contract the mixin needs. Widgets expose their existing
// web-js-sdk httpClient (the same instance used for every other API call),
// narrowed to this so no web-js-sdk/core-js-sdk type leaks into the widget's
// public sdk surface.
export interface ConditionsHttpClient {
  get: (path: string) => Promise<Response>;
}

// The widget's sdk (built by apiMixin) is expected to expose the client here.
interface ComponentsConditionsHost {
  api?: { httpClient?: ConditionsHttpClient };
}

/**
 * Shared widget mixin that fetches the server-computed component conditions
 * verdict for the current user and applies hide/disable/read-only to the widget
 * DOM. Server-side only - no client-side re-evaluation. Compose it LAST in a
 * widget's initMixin so its init wraps the widget's render.
 *
 * It reuses the widget's existing web-js-sdk httpClient (`this.api.httpClient`),
 * so `apiMixin` must be composed and `createSdk` must return `httpClient`. A
 * missing client is a wiring mistake, surfaced loudly (throw) rather than
 * silently rendering everything; a runtime fetch failure fails open instead.
 */
export const componentsConditionsMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) => {
    // NB: do not compose initLifecycleMixin here - its empty init() has no
    // super.init() call and would shadow the widget's render init.
    const BaseClass = compose(loggerMixin, initElementMixin)(superclass);

    return class ComponentsConditionsMixinClass extends BaseClass {
      #statePromise?: Promise<ComponentsState>;

      #appliedState: ComponentsState = {};

      #requireHttpClient(): ConditionsHttpClient {
        const httpClient = (this as unknown as ComponentsConditionsHost).api
          ?.httpClient;
        if (!httpClient) {
          // Developer misconfiguration (apiMixin not composed, or createSdk does
          // not expose httpClient) - fail loud so it is caught in development.
          throw new Error(
            'componentsConditionsMixin: the widget sdk must expose `httpClient`. Compose apiMixin and return `webSdk.httpClient` from createSdk.',
          );
        }
        return httpClient;
      }

      async #fetchComponentsState(
        httpClient: ConditionsHttpClient,
      ): Promise<ComponentsState> {
        try {
          const res = await httpClient.get(COMPONENTS_STATE_PATH);
          if (!res?.ok) return {};
          const body = await res.json();
          return body?.componentsState ?? {};
        } catch (e) {
          // Fail open: render everything. UI hiding is presentation, not access
          // control - sensitive data stays gated by the widget's data API.
          this.logger.debug(
            'components-conditions: failed to fetch, showing all components',
            (e as Error)?.message,
          );
          return {};
        }
      }

      async init() {
        if (this.getAttribute('mock') === 'true') {
          // Mock mode (demos / e2e) has no backend - skip the fetch, hide nothing.
          this.#statePromise = Promise.resolve({});
          await super.init?.();
          return;
        }
        // Resolve the client up front so a wiring mistake throws before the
        // fetch's fail-open path can swallow it.
        const httpClient = this.#requireHttpClient();
        // Fire immediately so it overlaps the page/data fetch super.init runs.
        this.#statePromise = this.#fetchComponentsState(httpClient);
        await super.init?.();
      }

      async onWidgetRootReady() {
        // @ts-expect-error onWidgetRootReady is provided by the widget's initWidgetRootMixin
        await super.onWidgetRootReady?.();
        // Apply once the DOM exists and component values are populated, before the
        // widget dispatches 'ready'. Awaiting here bounds any added latency to
        // max(0, conditionsFetch - pageFetch).
        this.#appliedState = (await this.#statePromise) ?? {};
        applyComponentsState(this.contentRootElement, this.#appliedState);
      }

      /**
       * Re-fetch and re-apply after the widget mutates data the conditions read
       * (e.g. a profile save). Public hook for the upcoming re-evaluate-on-mutation
       * work - no widget wires it to its mutating flows yet.
       */
      async reevaluateComponentsState() {
        const httpClient = this.#requireHttpClient();
        clearComponentsState(this.contentRootElement, this.#appliedState);
        this.#appliedState = await this.#fetchComponentsState(httpClient);
        applyComponentsState(this.contentRootElement, this.#appliedState);
      }
    };
  },
);
