/* eslint-disable import/prefer-default-export */
import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import { loggerMixin, projectIdMixin } from '@descope/sdk-mixins';

// Client-side form validation happens entirely in the browser (native
// reportValidity/checkValidity) and produces no signal today - and because an
// invalid form never submits, the server never sees it. This mixin captures
// those validation failures, batches them, and best-effort relays them to a new
// backend endpoint so customers get visibility into where users hit friction
// (and where they abandon a flow). It never blocks or fails the flow.

const FLOW_EVENT_PATH = '/v1/flow/event';

// Flush the batch after this much inactivity, or once it reaches the cap.
const FLUSH_DEBOUNCE_MS = 2000;
const MAX_BATCH_SIZE = 20;

// Bounded retry for normal (non-unload) flushes. Each event carries a stable
// `id`, so the backend/CDP dedups a retried batch (no double-counting).
const MAX_SEND_RETRIES = 2;
const RETRY_BACKOFF_MS = 800;

/** One captured validation failure, as sent to the backend. */
export type ValidationErrorEvent = {
  id: string;
  field: string;
  rule: string;
  message: string;
  screen: string;
  ts: number;
};

/** The flow context needed to attribute a batch to a point in the funnel. */
type FlowContext = {
  executionId?: string;
  stepId?: string;
  stepName?: string;
};

// The transport handle this mixin reads off the host component (DescopeWc, a
// subclass in the compose() chain, so it exists at runtime). Flow context is
// passed in per capture (see trackValidationErrors) rather than read off the
// host, to keep the capture logic testable and the coupling explicit.
type ValidationTrackingHost = {
  sdk?: { httpClient?: { buildUrl?: (path: string) => string } };
};

const dedupeKey = (e: { field: string; rule: string }, stepId?: string) =>
  `${stepId ?? ''}|${e.field}|${e.rule}`;

const newId = (): string => {
  try {
    return crypto.randomUUID();
  } catch {
    // very old browsers: good-enough uniqueness for an idempotency key
    return `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  }
};

/**
 * Map an input's ValidityState to a coarse machine-readable rule. We keep it
 * intentionally coarse: any "value is present but the wrong shape" failure
 * (bad email, pattern mismatch, bad input) collapses into a single `format`
 * bucket. This never mislabels - the exact reason the user saw is always in
 * `message`, and the field is in `field`. A field with a custom validation
 * message still keeps its native flag, so this stays accurate; only a fully
 * custom validator (setCustomValidity) reports `custom`.
 */
export const deriveValidationRule = (validity?: ValidityState): string => {
  if (!validity) return 'unknown';
  if (validity.valueMissing) return 'required';
  if (validity.typeMismatch || validity.patternMismatch || validity.badInput) {
    return 'format';
  }
  if (validity.tooShort) return 'too-short';
  if (validity.tooLong) return 'too-long';
  if (
    validity.rangeUnderflow ||
    validity.rangeOverflow ||
    validity.stepMismatch
  ) {
    return 'range';
  }
  if (validity.customError) return 'custom';
  return 'unknown';
};

/** Build one event from a failed input, or null if it has no name to report. */
const toEvent = (
  input: HTMLInputElement,
  ctx: FlowContext,
): ValidationErrorEvent | null => {
  const field = input?.getAttribute?.('name');
  if (!field) return null;
  return {
    id: newId(),
    field,
    rule: deriveValidationRule(input.validity),
    message: input.validationMessage || '',
    screen: ctx.stepName || '',
    ts: Date.now(),
  };
};

export const validationTrackingMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) => {
    const BaseClass = compose(loggerMixin, projectIdMixin)(superclass);

    return class ValidationTrackingMixinClass extends BaseClass {
      // Buffered events for the current step. Flushed on step change, flow end,
      // page hide, a size cap, or a short inactivity debounce.
      #buffer: ValidationErrorEvent[] = [];

      // executionId/stepId the current buffer belongs to. A batch is always
      // single-step (we flush before the step changes).
      #bufferExecutionId?: string;

      #bufferStepId?: string;

      #flushTimer?: ReturnType<typeof setTimeout>;

      // Pending retry timers. A failed flush leaves a chain in flight, and two
      // flushes can fail at once, so this holds more than one.
      #retryTimers = new Set<ReturnType<typeof setTimeout>>();

      #listenersAttached = false;

      // Off until the host turns it on from the flow's config.json entry. The
      // default matters: a host that never calls the setter captures nothing,
      // so a missing or stale config can never start collecting on its own.
      #enabled = false;

      // Events captured before the flow had an execution to attribute them to.
      // /v1/flow/event only accepts a live execution, so these wait here until
      // one exists. If the flow never starts - the user gives up on the first
      // screen - they are dropped, which is the known abandonment gap.
      #pending: ValidationErrorEvent[] = [];

      #boundFlushOnEnd = () => this.#flush(false);

      #boundFlushOnHide = () => {
        // Page unload / tab hidden - the abandonment case. Use a keepalive
        // request so it survives the page going away.
        if (document.visibilityState === 'hidden') this.#flush(true);
      };

      #boundFlushOnPageHide = () => this.#flush(true);

      get #host(): ValidationTrackingHost {
        return this as unknown as ValidationTrackingHost;
      }

      /**
       * Turn capture on or off. The host calls this from the flow's config,
       * where the setting is per flow and off unless the customer enabled it.
       * Turning it off drops whatever is buffered without sending it.
       */
      setValidationTrackingEnabled(enabled: boolean) {
        if (this.#enabled === enabled) return;
        this.#enabled = enabled;
        if (!enabled) this.#discard();
      }

      /**
       * Called by the host once the flow has an execution. Anything captured on
       * the start screen can now be attributed and sent.
       */
      adoptPendingValidationErrors(context: FlowContext) {
        try {
          if (!this.#enabled || !this.#pending.length) {
            this.#pending = [];
            return;
          }
          const ctx = context || {};
          if (!ctx.executionId) return;

          this.#attachListeners();
          // The buffer is single-step; don't mix the adopted events into a
          // batch belonging to another step.
          if (this.#buffer.length && this.#bufferStepId !== ctx.stepId) {
            this.#flush(false);
          }
          this.#bufferExecutionId = ctx.executionId;
          // These happened on the start screen, which has no step. Sending the
          // step the flow has now would point at the wrong place in the funnel;
          // the screen name on each event is what identifies where it happened.
          this.#bufferStepId = '';
          this.#buffer.push(...this.#pending);
          this.#pending = [];
          this.#flush(false);
        } catch (e) {
          this.logger?.debug?.(
            'Failed to send held validation errors',
            String(e),
          );
        }
      }

      /**
       * Public capture entry point. Called by the web-component at the two
       * validation points it already runs (submit + blur), passing the current
       * flow context. Best-effort: any failure here is swallowed so it can
       * never affect the flow.
       */
      trackValidationErrors(inputs: HTMLInputElement[], context: FlowContext) {
        try {
          this.#collect(inputs, context);
        } catch (e) {
          this.logger?.debug?.('Failed to track validation errors', String(e));
        }
      }

      #collect(inputs: HTMLInputElement[], context: FlowContext) {
        // Not enabled for this flow - capture nothing and attach no listeners.
        if (!this.#enabled) return;
        if (!inputs?.length) return;
        const ctx = context || {};
        // The start screen renders from config.json before the flow starts, so
        // there is no execution yet. Hold those events until there is one.
        if (!ctx.executionId) {
          this.#collectPending(inputs, ctx);
          return;
        }

        // Attach flush triggers on first real capture (nothing to flush before
        // there is a buffered event, so there's no reason to attach earlier).
        this.#attachListeners();

        // The buffer is single-step. If the step changed since we started
        // buffering, flush the old step first.
        if (this.#buffer.length && this.#bufferStepId !== ctx.stepId) {
          this.#flush(false);
        }
        this.#bufferExecutionId = ctx.executionId;
        this.#bufferStepId = ctx.stepId;

        inputs.forEach((input) => {
          const event = toEvent(input, ctx);
          if (!event) return;
          const key = dedupeKey(event, ctx.stepId);
          // Collapse the blur+submit double-fire of the SAME failure. Genuine
          // repeat failures land in a later batch (different flush), so this
          // does not hide real friction signal.
          if (this.#buffer.some((e) => dedupeKey(e, ctx.stepId) === key))
            return;
          this.#buffer.push(event);
        });

        if (this.#buffer.length >= MAX_BATCH_SIZE) {
          this.#flush(false);
        } else {
          this.#scheduleFlush();
        }
      }

      // Pre-execution capture. Same dedupe, but keyed without a step, since the
      // start screen has no step id. Capped like a normal batch so a user who
      // never starts the flow cannot grow this without bound.
      #collectPending(inputs: HTMLInputElement[], ctx: FlowContext) {
        inputs.forEach((input) => {
          if (this.#pending.length >= MAX_BATCH_SIZE) return;
          const event = toEvent(input, ctx);
          if (!event) return;
          const key = dedupeKey(event);
          if (this.#pending.some((e) => dedupeKey(e) === key)) return;
          this.#pending.push(event);
        });
      }

      #scheduleFlush() {
        clearTimeout(this.#flushTimer);
        this.#flushTimer = setTimeout(
          () => this.#flush(false),
          FLUSH_DEBOUNCE_MS,
        );
      }

      // Drop everything buffered without sending it, and cancel anything
      // already scheduled. Used when capture is switched off. Listeners that
      // were attached while it was on are left in place - they only call
      // #flush, which does nothing on an empty buffer.
      #discard() {
        clearTimeout(this.#flushTimer);
        this.#retryTimers.forEach(clearTimeout);
        this.#retryTimers.clear();
        this.#buffer = [];
        this.#pending = [];
        this.#bufferExecutionId = undefined;
        this.#bufferStepId = undefined;
      }

      #flush(isUnload: boolean) {
        clearTimeout(this.#flushTimer);
        const events = this.#buffer;
        const executionId = this.#bufferExecutionId;
        const stepId = this.#bufferStepId;
        this.#buffer = [];
        this.#bufferExecutionId = undefined;
        this.#bufferStepId = undefined;

        if (!events.length || !executionId) return;

        const { projectId } = this;
        const buildUrl = this.#host.sdk?.httpClient?.buildUrl;
        // buildUrl resolves the region-aware flow API base the SDK uses for
        // flow/start & flow/next - do NOT reconstruct the URL from an attribute
        // (empty in prod).
        if (!projectId || !buildUrl) return;

        try {
          const url = buildUrl(FLOW_EVENT_PATH);
          const init: RequestInit = {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${projectId}`,
            },
            body: JSON.stringify({ executionId, stepId, events }),
          };
          if (isUnload) {
            // Page is going away: single keepalive shot, retry isn't possible.
            fetch(url, { ...init, keepalive: true }).catch(() => {});
          } else {
            this.#sendWithRetry(url, init, MAX_SEND_RETRIES);
          }
        } catch (e) {
          this.logger?.debug?.('Failed to send validation events', String(e));
        }
      }

      // Best-effort send with bounded retry (non-unload flushes only). Gives up
      // quietly after the last attempt. Events carry a stable `id`, so a retried
      // batch is deduped downstream.
      #sendWithRetry(url: string, init: RequestInit, retriesLeft: number) {
        fetch(url, init)
          .then((res) => {
            // Only retry what can succeed later. A 4xx means this batch is
            // rejected on its merits - retrying it just triples the load.
            const worthRetrying = res.status >= 500 || res.status === 429;
            if (!res.ok && worthRetrying && retriesLeft > 0) {
              this.#scheduleRetry(url, init, retriesLeft);
            }
          })
          .catch(() => {
            if (retriesLeft > 0) {
              this.#scheduleRetry(url, init, retriesLeft);
            }
          });
      }

      #scheduleRetry(url: string, init: RequestInit, retriesLeft: number) {
        const attempt = MAX_SEND_RETRIES - retriesLeft + 1;
        const timer = setTimeout(() => {
          this.#retryTimers.delete(timer);
          this.#sendWithRetry(url, init, retriesLeft - 1);
        }, RETRY_BACKOFF_MS * attempt);
        this.#retryTimers.add(timer);
      }

      #attachListeners() {
        if (this.#listenersAttached) return;
        this.#listenersAttached = true;
        // Flush when the funnel context changes or the flow ends.
        this.addEventListener('screen-updated', this.#boundFlushOnEnd);
        this.addEventListener('success', this.#boundFlushOnEnd);
        this.addEventListener('error', this.#boundFlushOnEnd);
        // Abandonment: capture on the way out (keepalive request).
        document.addEventListener('visibilitychange', this.#boundFlushOnHide);
        window.addEventListener('pagehide', this.#boundFlushOnPageHide);
      }

      // Called by the host's disconnectedCallback: flush anything buffered and
      // detach listeners. This mixin intentionally does NOT override
      // connectedCallback/disconnectedCallback - several mixins in the compose
      // chain already do, and a third override trips a TS intersection typing
      // issue. Listeners are attached lazily on first capture instead.
      teardownValidationTracking() {
        this.#flush(false);
        // Anything still waiting for an execution never got one - drop it.
        this.#pending = [];
        // Drop any retry still waiting out its backoff - the component is gone.
        this.#retryTimers.forEach(clearTimeout);
        this.#retryTimers.clear();
        if (!this.#listenersAttached) return;
        this.#listenersAttached = false;
        this.removeEventListener('screen-updated', this.#boundFlushOnEnd);
        this.removeEventListener('success', this.#boundFlushOnEnd);
        this.removeEventListener('error', this.#boundFlushOnEnd);
        document.removeEventListener(
          'visibilitychange',
          this.#boundFlushOnHide,
        );
        window.removeEventListener('pagehide', this.#boundFlushOnPageHide);
      }
    };
  },
);
