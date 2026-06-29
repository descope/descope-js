/* eslint-disable import/prefer-default-export */
import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import { loggerMixin } from '@descope/sdk-mixins';

const DESCOPE_WC_TAG = 'descope-wc';
const PROJECT_ID_ATTR = 'project-id';
const FLOW_ID_ATTR = 'flow-id';

/**
 * All `<descope-wc>` elements in `el`'s document that run the same project-id
 * and flow-id as `el` (including `el` itself), in document order. Empty when
 * `el` is missing either attribute.
 */
export const getSameFlowInstances = (el: Element): Element[] => {
  const projectId = el.getAttribute(PROJECT_ID_ATTR);
  const flowId = el.getAttribute(FLOW_ID_ATTR);
  if (!projectId || !flowId) return [];
  return Array.from(el.ownerDocument.querySelectorAll(DESCOPE_WC_TAG)).filter(
    (other) =>
      other.getAttribute(PROJECT_ID_ATTR) === projectId &&
      other.getAttribute(FLOW_ID_ATTR) === flowId,
  );
};

/**
 * True when `el` is a same-flow duplicate that is NOT the first such element in
 * document order. Reporting only from the non-first element means exactly one
 * element per same-flow group reports `true`, so a single warning is emitted
 * regardless of how many duplicates exist. Note: light-DOM only — duplicates
 * nested inside another component's shadow root are intentionally not detected.
 */
export const isDuplicateSameFlowInstance = (el: Element): boolean => {
  const sameFlow = getSameFlowInstances(el);
  return sameFlow.length > 1 && sameFlow[0] !== el;
};

/**
 * Logs a one-time dev warning when more than one `<descope-wc>` on the page runs
 * the same project-id + flow-id. Rendering the same flow more than once is not
 * supported (it causes the post-login screen to flicker, among other issues).
 * Warning only — no behavior change. Hooks `connectedCallback` (not `init`) and
 * pulls in only `loggerMixin`, to avoid participating in the flow `init()` chain.
 */
export const duplicateFlowWarningMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) => {
    const BaseClass = compose(loggerMixin)(superclass);

    return class DuplicateFlowWarningMixinClass extends BaseClass {
      // The project|flow key this element has already warned for, so we warn at
      // most once per identity. connectedCallback can fire multiple times for
      // the same element (e.g. formMountMixin re-parents it into a <form>), so a
      // plain per-call warning would fire repeatedly.
      #warnedForKey?: string;

      #scheduleDuplicateFlowCheck() {
        // Defer so sibling instances mounted in the same tick are attached to
        // the DOM before we query it.
        queueMicrotask(() => {
          if (!this.isConnected) return;
          const projectId = this.getAttribute(PROJECT_ID_ATTR);
          const flowId = this.getAttribute(FLOW_ID_ATTR);
          const key = `${projectId}|${flowId}`;
          // Bail before the DOM query when we've already warned for this
          // identity — connectedCallback can fire several times per element.
          if (
            this.#warnedForKey === key ||
            !isDuplicateSameFlowInstance(this)
          ) {
            return;
          }
          this.#warnedForKey = key;
          this.logger.warn(
            'Multiple Descope flow components detected on the same page',
            `More than one <descope-wc> is running the same project ("${projectId}") and flow ("${flowId}") on this page. Running the same flow in more than one component at once is not supported and may cause the flow to behave unexpectedly. Render a single Descope flow component per page.`,
          );
        });
      }

      connectedCallback() {
        super.connectedCallback?.();
        this.#scheduleDuplicateFlowCheck();
      }

      // Re-check when the flow identity changes at runtime. Relies on
      // BaseDescopeWc forwarding `super.attributeChangedCallback?.()` (it only
      // forwards post-init changes, so this does not double-fire on mount).
      attributeChangedCallback(
        attrName: string,
        oldValue: string,
        newValue: string,
      ) {
        super.attributeChangedCallback?.(attrName, oldValue, newValue);
        if (
          oldValue !== newValue &&
          (attrName === PROJECT_ID_ATTR || attrName === FLOW_ID_ATTR)
        ) {
          this.#scheduleDuplicateFlowCheck();
        }
      }
    };
  },
);
