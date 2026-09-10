/* eslint-disable import/prefer-default-export */
import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import { loggerMixin } from '@descope/sdk-mixins';

// Client-side form validation happens entirely in the browser (native
// reportValidity/checkValidity) and produces no signal on its own - because an
// invalid form never submits, the server never sees it. This mixin captures
// those failures and batches them, so customers get visibility into where users
// hit friction. Sending is the host's job - see ValidationSender below.
//
// Off unless the flow turns it on: the host calls setValidationTrackingEnabled
// from the flow's config.json entry, and nothing is captured until it does.
// It never blocks or fails the flow.

/**
 * How a batch reaches the backend. The host supplies this (DescopeWc hands over
 * sdk.flow.event), so the mixin owns capture and batching and knows nothing
 * about transport, URLs or the SDK. Resolves to whether the batch was accepted
 * and whether retrying could ever help.
 */
export type ValidationSendResult = { ok: boolean; retryable: boolean };
export type ValidationBatch = {
  executionId: string;
  events: ValidationErrorEvent[];
};
export type ValidationSender = (
  batch: ValidationBatch,
  options: { keepalive: boolean },
) => Promise<ValidationSendResult>;

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
    const BaseClass = compose(loggerMixin)(superclass);

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

      // Bumped whenever in-flight work stops being wanted: tracking switched
      // off, or the component torn down. A send captures the value it started
      // with, so a response that lands after either event cannot resurrect a
      // retry chain the switch/teardown was supposed to end.
      #generation = 0;

      // Supplied by the host. Without it nothing can be sent, which is the
      // same safe default as being switched off.
      #send?: ValidationSender;

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

      /** The host tells the mixin how to deliver a batch. */
      setValidationTrackingSender(send: ValidationSender) {
        this.#send = send;
      }

      /**
       * The flow now has an execution. Anything captured before it started -
       * on the start screen - can finally be attributed and sent.
       */
      setValidationTrackingExecution(executionId: string) {
        // Nothing held means nothing to attribute. Storing the id anyway would
        // leave it behind for a later batch that belongs to a different
        // execution - see the matching guard in #flush.
        if (!this.#enabled || !executionId || !this.#buffer.length) return;
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

        inputs.forEach((input) => {
          // Still full after the flush below tried to drain it, which means it
          // cannot be sent yet. Hold at the cap so an abandoned start screen
          // cannot grow without bound - dropping the rest is the price.
          if (this.#buffer.length >= MAX_BATCH_SIZE) return;
          const event = toEvent(input, ctx);
          if (!event) return;
          const key = dedupeKey(event);
          if (this.#buffer.some((e) => dedupeKey(e) === key)) return;
          this.#buffer.push(event);
          // Tied to the batch, so it is set only once something is actually in
          // it, and re-set after a flush below empties it. Before the flow
          // starts this stays unset and the buffer just holds.
          this.#bufferExecutionId = ctx.executionId || this.#bufferExecutionId;
          // A deliverable batch is sent as soon as it fills up, and the rest of
          // this submit keeps collecting into a fresh one. A submit with more
          // than MAX_BATCH_SIZE invalid fields then loses nothing.
          if (this.#buffer.length >= MAX_BATCH_SIZE) this.#flush(false);
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
        this.#generation += 1;
        this.#retryTimers.forEach(clearTimeout);
        this.#retryTimers.clear();
        this.#buffer = [];
        this.#bufferExecutionId = undefined;
      }

      #flush(isUnload: boolean) {
        clearTimeout(this.#flushTimer);
        // Nothing buffered: drop the execution too. Holding it would outlive
        // the batch it belonged to, and after a flow restart the next
        // start-screen error would be attributed to the finished execution
        // instead of being held for the new one.
        if (!this.#buffer.length) {
          this.#bufferExecutionId = undefined;
          return;
        }
        // No execution yet - hold, don't drop. The endpoint would reject it.
        if (!this.#bufferExecutionId) return;

        // No way to deliver yet - hold rather than drain into nothing.
        if (!this.#send) return;

        const events = this.#buffer;
        const executionId = this.#bufferExecutionId;
        this.#buffer = [];
        this.#bufferExecutionId = undefined;

        try {
          const batch = { executionId, events };
          if (isUnload) {
            // Page is going away: single keepalive shot, retry isn't possible.
            this.#send(batch, { keepalive: true }).catch(() => {});
          } else {
            this.#sendWithRetry(batch, MAX_SEND_RETRIES, this.#generation);
          }
        } catch (e) {
          this.logger?.debug?.('Failed to send validation events', String(e));
        }
      }

      // Best-effort send with bounded retry (non-unload flushes only). Gives up
      // quietly after the last attempt. Events carry a stable `id`, so a retried
      // batch is deduped downstream.
      #sendWithRetry(
        batch: ValidationBatch,
        retriesLeft: number,
        generation: number,
      ) {
        this.#send(batch, { keepalive: false })
          .then((res) => {
            // Only retry what can succeed later - a rejected batch will not
            // become accepted, and retrying it just multiplies the load.
            if (!res.ok && res.retryable && retriesLeft > 0) {
              this.#scheduleRetry(batch, retriesLeft, generation);
            }
          })
          .catch(() => {
            // transport failure - worth another go
            if (retriesLeft > 0) {
              this.#scheduleRetry(batch, retriesLeft, generation);
            }
          });
      }

      #scheduleRetry(
        batch: ValidationBatch,
        retriesLeft: number,
        generation: number,
      ) {
        // A request already in flight when tracking is switched off - or when
        // the component went away - would otherwise keep retrying past it.
        if (generation !== this.#generation) return;
        const attempt = MAX_SEND_RETRIES - retriesLeft + 1;
        const timer = setTimeout(() => {
          this.#retryTimers.delete(timer);
          if (generation !== this.#generation) return;
          this.#sendWithRetry(batch, retriesLeft - 1, generation);
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
        // Bumping the generation also covers a send still in flight, whose
        // response would otherwise schedule a fresh timer after this cleanup.
        this.#generation += 1;
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
