/* eslint-disable import/prefer-default-export */
import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import { loggerMixin, projectIdMixin } from '@descope/sdk-mixins';

// Client-side form validation happens entirely in the browser (native
// reportValidity/checkValidity) and produces no signal on its own - because an
// invalid form never submits, the server never sees it. This mixin captures
// those failures, batches them, and best-effort relays them to POST
// /v1/flow/event so customers get visibility into where users hit friction.
//
// Off unless the flow turns it on: the host calls setValidationTrackingEnabled
// from the flow's config.json entry, and nothing is captured until it does.
// It never blocks or fails the flow.

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
  screenId: string;
  screenName: string;
  ts: number;
};

/**
 * Where a batch belongs. Validation only ever happens on a screen, so the
 * screen is the location - there is no step in this model.
 */
type FlowContext = {
  executionId?: string;
  screenId?: string;
  screenName?: string;
};

// Same field failing the same way on the same screen is one signal, however
// many times it fires (blur then submit).
const dedupeKey = (e: ValidationErrorEvent) =>
  `${e.screenId}|${e.field}|${e.rule}`;

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
    screenId: ctx.screenId || '',
    screenName: ctx.screenName || '',
    ts: Date.now(),
  };
};

export const validationTrackingMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) => {
    const BaseClass = compose(loggerMixin, projectIdMixin)(superclass);

    return class ValidationTrackingMixinClass extends BaseClass {
      // Captured events waiting to go out. Flushed on screen change, flow end,
      // page hide, a size cap, or a short inactivity debounce. Each event
      // carries its own screen, so a batch need not be single-screen.
      #buffer: ValidationErrorEvent[] = [];

      // The execution the buffer belongs to. Unset until the flow starts: the
      // start screen renders from config.json before /v1/flow/start, and the
      // endpoint only accepts a live execution, so those events wait here. If
      // the flow never starts - the user gave up on the first screen - they are
      // dropped. That is the known abandonment gap.
      #bufferExecutionId?: string;

      #flushTimer?: ReturnType<typeof setTimeout>;

      // Pending retry timers. A failed flush leaves a chain in flight, and two
      // flushes can fail at once, so this holds more than one.
      #retryTimers = new Set<ReturnType<typeof setTimeout>>();

      #listenersAttached = false;

      // Off until the host turns it on from the flow's config.json entry. The
      // default matters: a host that never calls the setter captures nothing,
      // so a missing or stale config can never start collecting on its own.
      #enabled = false;

      #boundFlushOnEnd = () => this.#flush(false);

      #boundFlushOnHide = () => {
        // Page unload / tab hidden - the abandonment case. Use a keepalive
        // request so it survives the page going away.
        if (document.visibilityState === 'hidden') this.#flush(true);
      };

      #boundFlushOnPageHide = () => this.#flush(true);

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
       * The flow now has an execution. Anything captured before it started -
       * on the start screen - can finally be attributed and sent.
       */
      setValidationTrackingExecution(executionId: string) {
        if (!this.#enabled || !executionId) return;
        this.#bufferExecutionId = executionId;
        this.#flush(false);
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

        // Attach flush triggers on first real capture (nothing to flush before
        // there is a buffered event, so there's no reason to attach earlier).
        this.#attachListeners();
        // Before the flow starts this stays unset and the buffer just holds.
        this.#bufferExecutionId = ctx.executionId || this.#bufferExecutionId;

        inputs.forEach((input) => {
          // The cap also bounds a buffer that is holding because the flow never
          // started, so an abandoned start screen cannot grow without bound.
          if (this.#buffer.length >= MAX_BATCH_SIZE) return;
          const event = toEvent(input, ctx);
          if (!event) return;
          const key = dedupeKey(event);
          if (this.#buffer.some((e) => dedupeKey(e) === key)) return;
          this.#buffer.push(event);
        });

        if (this.#buffer.length >= MAX_BATCH_SIZE) {
          this.#flush(false);
        } else {
          this.#scheduleFlush();
        }
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
        this.#bufferExecutionId = undefined;
      }

      #flush(isUnload: boolean) {
        clearTimeout(this.#flushTimer);
        // No execution yet - hold, don't drop. The endpoint would reject it.
        if (!this.#buffer.length || !this.#bufferExecutionId) return;

        const events = this.#buffer;
        const executionId = this.#bufferExecutionId;
        this.#buffer = [];
        this.#bufferExecutionId = undefined;

        const { projectId } = this;
        // The SDK instance lives on the host (DescopeWc, a subclass in the
        // compose() chain, so it exists at runtime).
        const { sdk } = this as unknown as {
          sdk?: { httpClient?: { buildUrl?: (path: string) => string } };
        };
        const buildUrl = sdk?.httpClient?.buildUrl;
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
            body: JSON.stringify({ executionId, events }),
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
        // Anything still held never got an execution - #flush leaves it, and
        // the component is going away, so it is dropped with the instance.
        this.#flush(false);
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
