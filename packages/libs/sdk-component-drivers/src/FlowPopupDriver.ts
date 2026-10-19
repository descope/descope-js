import { openCenteredPopup } from '@descope/sdk-helpers';

// mirrors the `descope-wc|<origin>` convention DescopeWc already uses for its
// OAuth popup, with a distinct prefix so the two never pick up each other's
// messages
const POPUP_NAME_PREFIX = 'descope-widget-flow';
const DONE_ACTION = 'widget-flow-done';
// The popup does not sign anyone in: it cannot choose how, since it runs the
// project's own sign-in flow, which may send a link and strand the user in
// another tab. Login belongs to the app, whose OIDC redirect re-establishes the
// session on the auth domain too.
const UNAUTHENTICATED_ACTION = 'widget-flow-unauthenticated';
const CLOSED_POLL_MS = 1000;
const POPUP_WIDTH = 480;
const POPUP_HEIGHT = 650;

type Logger = {
  error(...data: any[]): void;
  warn(...data: any[]): void;
  info(...data: any[]): void;
  debug(...data: any[]): void;
};

/**
 * Runs a widget flow in a popup on another origin, and reports back when it
 * finishes or the window goes away.
 *
 * The popup exists so the flow runs on the auth domain rather than the app's:
 * a passkey belongs to the domain that created it, so a passkey made here works
 * on every app that signs in through that same domain.
 *
 * The page in the popup sends only "finished" - never tokens. The opener
 * refreshes using its own refresh token, so nothing sensitive crosses the
 * origin boundary and a mis-declared opener origin costs very little.
 *
 * Note this driver does not extend BaseDriver: there is no element behind it.
 * It lives here because the flow runner swaps between it and ModalDriver.
 */
export class FlowPopupDriver {
  logger: Logger | undefined;

  #popup: Window | null = null;

  #expectedOrigin = '';

  #pollId: ReturnType<typeof setInterval> | undefined;

  #onMessage: ((event: MessageEvent) => void) | undefined;

  // a popup settles once: either the flow reported done, or the window closed
  #settled = false;

  #doneCallbacks: (() => void)[] = [];

  #closedCallbacks: (() => void)[] = [];

  #unauthenticatedCallbacks: (() => void)[] = [];

  #parentFocusCallbacks: (() => void)[] = [];

  #onParentFocus: (() => void) | undefined;

  // fires at most once per open, so coming back to the app costs one re-check
  // rather than one on every alt-tab
  #focusReported = false;

  constructor(config: { logger?: Logger } = {}) {
    this.logger = config.logger;
  }

  onDone(cb: () => void) {
    this.#doneCallbacks.push(cb);
    return () => {
      this.#doneCallbacks = this.#doneCallbacks.filter((c) => c !== cb);
    };
  }

  onClosed(cb: () => void) {
    this.#closedCallbacks.push(cb);
    return () => {
      this.#closedCallbacks = this.#closedCallbacks.filter((c) => c !== cb);
    };
  }

  /**
   * The person came back to the app while this popup was open.
   *
   * A flow can finish somewhere this popup cannot hear - the tab an emailed
   * link opens, or the same link opened on a phone. Nothing can report from
   * there, so the app re-checks when the user returns to it. Fires once per
   * open; the popup is left alone in case the user is only glancing over and
   * goes back to finish.
   */
  onParentFocus(cb: () => void) {
    this.#parentFocusCallbacks.push(cb);
    return () => {
      this.#parentFocusCallbacks = this.#parentFocusCallbacks.filter(
        (c) => c !== cb,
      );
    };
  }

  /** The popup does not know who the user is; the app should sign them in. */
  onUnauthenticated(cb: () => void) {
    this.#unauthenticatedCallbacks.push(cb);
    return () => {
      this.#unauthenticatedCallbacks = this.#unauthenticatedCallbacks.filter(
        (c) => c !== cb,
      );
    };
  }

  get isOpen() {
    return !!this.#popup && !this.#popup.closed;
  }

  /**
   * Opens the popup. Must be called synchronously from a user gesture - any
   * `await` before this and the browser blocks the window.
   *
   * Returns false when the popup was blocked, so the caller can tell the user
   * something useful instead of waiting for a result that never arrives.
   */
  open(url: string): boolean {
    this.#cleanup();
    this.#settled = false;
    this.#focusReported = false;

    try {
      this.#expectedOrigin = new URL(url).origin;
    } catch {
      this.logger?.error('Invalid flow popup url', url);
      return false;
    }

    // Tells the page in the popup where to post its result back to. This has to
    // be the window name given at creation, not assigned afterwards: by the
    // time open() returns, the window is already navigating to another origin
    // and the assignment is silently refused, leaving the page with no opener
    // origin and no way to report back.
    const popupName = `${POPUP_NAME_PREFIX}|${window.location.origin}`;

    this.#popup = openCenteredPopup(url, popupName, POPUP_WIDTH, POPUP_HEIGHT);

    if (!this.#popup) {
      this.logger?.warn('Flow popup was blocked by the browser');
      return false;
    }

    this.#onMessage = (event: MessageEvent) => {
      if (event.origin !== this.#expectedOrigin) {
        this.logger?.debug(
          `Ignoring popup message from unexpected origin "${event.origin}"`,
        );
        return;
      }
      if (event.data?.action === UNAUTHENTICATED_ACTION) {
        this.#settle(this.#unauthenticatedCallbacks);
        return;
      }
      if (event.data?.action !== DONE_ACTION) return;
      this.#settle(this.#doneCallbacks);
    };
    window.addEventListener('message', this.#onMessage);

    // backstop: the user can always close the window without finishing
    this.#pollId = setInterval(() => {
      if (this.#popup?.closed) this.#settle(this.#closedCallbacks);
    }, CLOSED_POLL_MS);

    // Opening the popup takes focus away; getting it back means the person is
    // looking at the app again, and whatever they went off to do may be done.
    // visibilitychange covers the case where the popup is a tab rather than a
    // window, which is what iOS Safari gives us.
    this.#onParentFocus = () => {
      if (document.visibilityState === 'hidden') return;
      if (this.#focusReported || this.#settled) return;
      this.#focusReported = true;
      this.#parentFocusCallbacks.forEach((cb) => cb());
    };
    window.addEventListener('focus', this.#onParentFocus);
    document.addEventListener('visibilitychange', this.#onParentFocus);

    return true;
  }

  close() {
    try {
      this.#popup?.close();
    } catch {
      // closing a window we opened should not throw, but it is not worth
      // breaking the flow over if it does
    }
    this.#settle(this.#closedCallbacks);
  }

  remove() {
    this.#cleanup();
  }

  #settle(callbacks: (() => void)[]) {
    if (this.#settled) return;
    this.#settled = true;
    this.#cleanup();
    callbacks.forEach((cb) => cb());
  }

  #cleanup() {
    if (this.#pollId) {
      clearInterval(this.#pollId);
      this.#pollId = undefined;
    }
    if (this.#onMessage) {
      window.removeEventListener('message', this.#onMessage);
      this.#onMessage = undefined;
    }
    if (this.#onParentFocus) {
      window.removeEventListener('focus', this.#onParentFocus);
      document.removeEventListener('visibilitychange', this.#onParentFocus);
      this.#onParentFocus = undefined;
    }
  }
}
