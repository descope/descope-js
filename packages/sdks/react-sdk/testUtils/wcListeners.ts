/**
 * The SDK's components attach their web-component event listeners from a
 * `useEffect`. React flushes that before a `waitFor` on the element resolves;
 * Preact schedules it after paint, so the element being in the DOM does not
 * mean the listener is there yet - and an event dispatched before it is
 * attached is lost, not deferred.
 *
 * Importing this module records every `addEventListener` call so a test can
 * wait for the attachment itself. That is a real condition to poll on, rather
 * than a fixed delay racing the effect queue.
 */
import { waitFor } from '@testing-library/react';

const attached = new WeakMap<EventTarget, Set<string>>();

const originalAddEventListener = EventTarget.prototype.addEventListener;

EventTarget.prototype.addEventListener = function recordAddEventListener(
  this: EventTarget,
  type: string,
  ...rest: any[]
) {
  let types = attached.get(this);
  if (!types) {
    types = new Set();
    attached.set(this, types);
  }
  types.add(type);
  return (originalAddEventListener as any).call(this, type, ...rest);
};

/** Resolves once `target` has had a listener attached for `type`. */
export const waitForListener = (target: EventTarget, type: string) =>
  waitFor(() => expect(attached.get(target)?.has(type)).toBe(true));

/**
 * Waits for `tag` to mount inside `container` and for the SDK to have attached
 * its listener for `type` (default `error`, which every flow and widget with a
 * callback registers). Returns the element, ready to dispatch at.
 */
export const findWcWithListener = async (
  container: HTMLElement,
  tag = 'descope-wc',
  type = 'error',
) => {
  await waitFor(() => expect(container.querySelector(tag)).toBeTruthy());
  const el = container.querySelector(tag) as HTMLElement;
  await waitForListener(el, type);
  return el;
};
