import { FlowDriver, FlowPopupDriver } from '@descope/sdk-component-drivers';
import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import {
  loggerMixin,
  flowModalMixin,
  flowInputMixin,
  widgetConfigMixin,
} from '@descope/sdk-mixins';
import { flowSyncThemeMixin } from './flowSyncThemeMixin';
import { flowPopupSessionMixin } from './flowPopupSessionMixin';
import { initWidgetRootMixin } from './initMixin/initComponentsMixins/initWidgetRootMixin';

// per-open flow inputs, e.g. the specific passkey being removed
export type FlowRunnerInputs = {
  form?: Record<string, any>;
  client?: Record<string, any>;
  /**
   * Run a different flow than the one the runner was created with.
   *
   * Only the generic flow button needs this: every one of its buttons shares a
   * single modal - the e2e and the modal's own html are keyed on that one
   * data-id - but each button runs its own flow.
   */
  flowId?: string;
};

export type FlowRunnerConfig = {
  // the modal's data-id, e.g. 'add-passkey'
  dataId: string;
  flowId: string;
  closeOnOutsideClick?: boolean;
  /**
   * Whether the flow content is built up front and rebuilt after each close
   * (true), or only when `open()` is called (false).
   *
   * Both shapes exist in the widget today and they are not interchangeable:
   * a flow with no per-open inputs preloads so the modal renders instantly,
   * while a flow that needs inputs - which passkey removal does, carrying the
   * credential id - cannot be built until the user picks what to act on.
   */
  presetContent?: boolean;
  /**
   * Open the modal only once the flow renders its first page, rather than on
   * `open()`. A flow that redirects straight away then never flashes an empty
   * modal at the user. Implies starting the flow eagerly, since it has to run
   * far enough to render something before there is anything to show.
   *
   * Ignored in popup mode: a popup has to be opened synchronously from the
   * click or the browser blocks it, so there is nothing to defer.
   */
  deferOpenUntilFirstPage?: boolean;
  onSuccess?: () => void;
};

export type FlowRunner = {
  open(inputs?: FlowRunnerInputs): void;
  close(): void;
  remove(): void;
  /**
   * Rebuild the preloaded flow so it refetches current data instead of what it
   * captured when it was seeded - call this when the underlying value changes.
   *
   * Does nothing while the flow is open, which would drop what the user is in
   * the middle of, and nothing at all in popup mode, where the url is built
   * fresh on every open and so is never stale.
   */
  refresh(): void;
};

// descope-wc attribute -> popup query parameter, using auth-hosting's existing
// parameter names. The project id is not here: auth-hosting takes it from the
// path, not the query string.
const ATTR_TO_PARAM: Record<string, string> = {
  'flow-id': 'flow',
  theme: 'theme',
  'style-id': 'style',
  locale: 'locale',
  tenant: 'tenant',
};

// JSON object attributes, expanded as `client.<key>` / `form.<key>`
const OBJECT_ATTRS = ['client', 'form'];

/**
 * The length above which a popup url is worth complaining about.
 *
 * Not a hard cap. Browsers, servers and the CDN in front of a custom domain all
 * have their own limits and the lowest is usually not the browser; 2000 is the
 * figure that is safe everywhere, so this is a warning line rather than a cliff.
 *
 * Nothing sent today comes near it - removing a passkey is the biggest at about
 * 260 characters. The guard is here because the failure is silent: the popup
 * opens, the request is refused, and the widget waits for a flow that never
 * started. One logged line saves someone a long afternoon.
 *
 * The rule it protects: the popup url carries identifiers, never payloads. If a
 * flow ever needs real data, send it over postMessage once the popup is up
 * rather than making the url longer.
 */
export const POPUP_URL_MAX_CHARS = 2000;

/**
 * Turns the flow template's `<descope-wc>` into an auth-hosting url:
 * `<hostedPageBaseUrl>/<projectId>?flow=...`.
 *
 * Taking the attributes off the template rather than rebuilding the config
 * keeps one source of truth for what a flow runs with, whether it ends up in a
 * modal or a popup.
 *
 * Base urls and the refresh cookie name are deliberately not forwarded: the
 * page in the popup resolves those from its own environment, so an opener
 * cannot tell it where to send credentials.
 */
export const buildFlowPopupUrl = (
  hostedPageBaseUrl: string,
  flowEle: Element | null,
  onParseError?: (attr: string, raw: string) => void,
  onTooLong?: (length: number) => void,
): string => {
  const projectId = flowEle?.getAttribute('project-id') || '';
  // auth-hosting reads the project from the last path segment
  const url = new URL(`${hostedPageBaseUrl.replace(/\/$/, '')}/${projectId}`);

  Object.entries(ATTR_TO_PARAM).forEach(([attr, param]) => {
    const value = flowEle?.getAttribute(attr);
    if (value) url.searchParams.set(param, value);
  });

  OBJECT_ATTRS.forEach((attr) => {
    const raw = flowEle?.getAttribute(attr);
    if (!raw) return;
    try {
      Object.entries(JSON.parse(raw)).forEach(([key, value]) => {
        url.searchParams.set(`${attr}.${key}`, String(value));
      });
    } catch (e) {
      onParseError?.(attr, raw);
    }
  });

  const href = url.toString();
  // reported, not truncated: dropping inputs would break the flow in a way that
  // is even harder to see than a refused request
  if (href.length > POPUP_URL_MAX_CHARS) onTooLong?.(href.length);
  return href;
};

/**
 * Where a flow should run, given what the project published.
 *
 * "popup" is only honoured when there is somewhere to open it. The url is
 * absent whenever the project has no custom domain of its own, and the backend
 * deliberately omits it rather than publishing the shared Descope host - so
 * this is the client half of that guard. Both inputs missing means "modal",
 * which is what every project that has not opted in gets.
 *
 * Pure, and exported, so the choice can be tested without standing up the
 * widget's whole mixin chain.
 */
export const resolveFlowTarget = (
  flowTarget: string | undefined,
  hostedPageBaseUrl: string | undefined,
  onUnavailable?: () => void,
): 'modal' | 'popup' => {
  if (flowTarget !== 'popup') return 'modal';
  if (!hostedPageBaseUrl) {
    onUnavailable?.();
    return 'modal';
  }
  return 'popup';
};

/**
 * One place that owns running a widget flow: the modal, the content lifecycle,
 * the theme sync and the success wiring.
 *
 * It exists so the choice of where a flow runs - in page, or in a popup on the
 * auth domain - is made once rather than at each of the widget's 25 call sites.
 * Only the passkey mixins use it so far; the rest migrate separately.
 *
 * Lives in the widget rather than `sdk-mixins` because it needs
 * `flowSyncThemeMixin`, which is widget-local, and no second widget needs it
 * yet.
 */
export const flowRunnerMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class FlowRunnerMixinClass extends compose(
      loggerMixin,
      flowModalMixin,
      flowInputMixin,
      flowSyncThemeMixin,
      widgetConfigMixin,
      // composed here rather than in initMixin on purpose: the runner is the
      // only caller of onFlowPopupClosed, so this keeps the dependency local
      // and, more practically, initMixin's compose chain is already at
      // TypeScript's inference limit - a 25th link there makes the whole chain
      // stop being assignable to Mixin
      flowPopupSessionMixin,
      // for onWidgetRootReady, which this mixin hooks - see below
      initWidgetRootMixin,
    )(superclass) {
      // Resolved once and cached, because createFlowRunner runs synchronously
      // while the widget is building its components, and reading config.json is
      // a promise. Both default to "off", so a project that has not opted in -
      // or has no custom domain - keeps using modals.
      #flowTarget = 'modal';

      #hostedPageBaseUrl = '';

      #resolved: Promise<void> | undefined;

      async #resolve() {
        const widgetConfig = await this.getWidgetConfig();
        const hostedPageBaseUrl = await this.getHostedPageBaseUrl();

        this.#flowTarget = resolveFlowTarget(
          widgetConfig?.flowTarget,
          hostedPageBaseUrl,
          () =>
            this.logger?.error(
              'Flows are configured to open in a popup, but this project has no custom domain, so they will open in a modal instead',
            ),
        );
        this.#hostedPageBaseUrl = hostedPageBaseUrl || '';
      }

      /**
       * Resolved here rather than in `init()` because `init()` ordering across
       * the widget's mixin graph is not guaranteed to put this before the
       * component mixins - and it does not. Every component mixin awaits
       * `super.onWidgetRootReady()` before it calls `createFlowRunner`, and
       * this mixin is always below them in the chain, so this hook is the one
       * place the choice is certain to be known in time.
       */
      async onWidgetRootReady() {
        this.#resolved ??= this.#resolve();
        await this.#resolved;
        await super.onWidgetRootReady?.();
      }

      #buildPopupUrl(flowId: string, inputs?: FlowRunnerInputs): string {
        const template = this.createFlowTemplate({ flowId, ...inputs });
        return buildFlowPopupUrl(
          this.#hostedPageBaseUrl,
          template.content.querySelector('descope-wc'),
          (attr, raw) =>
            this.logger?.error(`Could not parse flow ${attr} inputs`, raw),
          (length) =>
            this.logger?.error(
              `The flow popup url is ${length} characters, past the ${POPUP_URL_MAX_CHARS} that is safe everywhere, so the popup may be refused before the flow starts. Pass identifiers in form and client inputs rather than data.`,
            ),
        );
      }

      #createPopupRunner(
        flowId: string,
        onSuccess?: () => void,
      ): FlowRunner | undefined {
        if (!this.#hostedPageBaseUrl) return undefined;

        const popup = new FlowPopupDriver({ logger: this.logger });

        // One cast, named once. flowPopupSessionMixin adds this, but compose()
        // erases the members a mixin adds, so it cannot be reached by type.
        const recheckSession = () => (this as any).onFlowPopupClosed?.();

        // The popup does not sign anyone in - it cannot choose how, since it
        // runs the project's own sign-in flow, which may send a link and strand
        // the user in another tab. Login belongs to the app, whose OIDC
        // redirect re-establishes the session on the auth domain too. Routed
        // through the existing logout event, which host apps already handle.
        popup.onUnauthenticated(() => {
          this.logger?.info(
            'The auth domain does not recognise this user; asking the app to sign in again',
          );
          this.dispatchEvent(new CustomEvent('logout'));
        });
        popup.onDone(() => {
          onSuccess?.();
          recheckSession();
        });
        // the flow may have changed the user before the window went away, so
        // the parent re-checks its session on every close, not just on success
        popup.onClosed(recheckSession);
        // A flow can finish where this popup cannot hear it - the tab an
        // emailed link opens, or that link opened on a phone. Nothing can
        // report back from there, so re-check when the person returns to the
        // app. Once per open, so it costs one extra check, not one per
        // alt-tab.
        popup.onParentFocus(recheckSession);

        return {
          // no awaiting before open() - the browser blocks a popup that is not
          // opened straight from the user gesture
          open: (inputs?: FlowRunnerInputs) =>
            popup.open(this.#buildPopupUrl(flowId, inputs)),
          close: () => popup.close(),
          remove: () => popup.remove(),
          // the url carries the inputs and is rebuilt on every open, so there
          // is nothing cached to go stale
          refresh: () => {},
        };
      }

      /**
       * Returns `undefined` when the component has no flow id configured, so
       * call sites keep the `runner?.open()` shape they already use for modals.
       */
      createFlowRunner({
        dataId,
        flowId,
        closeOnOutsideClick = true,
        presetContent = true,
        deferOpenUntilFirstPage = false,
        onSuccess,
      }: FlowRunnerConfig): FlowRunner | undefined {
        if (!flowId) return undefined;

        if (this.#flowTarget === 'popup') {
          const runner = this.#createPopupRunner(flowId, onSuccess);
          if (runner) return runner;
          // fall through to the modal rather than leaving the button dead
        }

        const modal = this.createFlowModal({
          'data-id': dataId,
          ...(closeOnOutsideClick ? { 'close-on-outside-click': 'true' } : {}),
        });

        const flow = new FlowDriver(
          () => modal.ele?.querySelector('descope-wc'),
          {
            logger: this.logger,
          },
        );
        this.syncFlowTheme(flow);

        // dropped once the modal has been opened, or the modal closed, so a
        // listener from one open never fires for the next
        let stopWaitingForFirstPage: (() => void) | null = null;
        const forgetFirstPage = () => {
          stopWaitingForFirstPage?.();
          stopWaitingForFirstPage = null;
        };

        // setContent replaces the element, so the success listener is attached
        // to the new one each time rather than accumulating on an old one
        const setContent = (inputs?: FlowRunnerInputs) => {
          modal.setContent(
            this.createFlowTemplate({
              flowId,
              // the flow has to start before the modal opens, since the first
              // rendered page is what decides whether it opens at all
              ...(deferOpenUntilFirstPage ? { lazyStart: false } : {}),
              ...inputs,
            }),
          );
          if (deferOpenUntilFirstPage) {
            forgetFirstPage();
            stopWaitingForFirstPage = flow.onPageUpdated(() => {
              modal.open();
              forgetFirstPage();
            });
          }
          flow.onSuccess(() => {
            modal.close();
            onSuccess?.();
          });
        };

        if (deferOpenUntilFirstPage) {
          modal.afterClose = forgetFirstPage;
        } else if (presetContent) {
          modal.afterClose = () => setContent();
          setContent();
        }

        return {
          open: (inputs?: FlowRunnerInputs) => {
            if (inputs || !presetContent || deferOpenUntilFirstPage) {
              setContent(inputs);
            }
            if (!deferOpenUntilFirstPage) modal.open();
          },
          close: () => modal.close(),
          remove: () => modal.remove(),
          // only while closed - rebuilding an open modal would drop the flow
          // the user is part way through. Nothing is preloaded when the open
          // is deferred, so there is nothing to refresh either.
          refresh: () => {
            if (presetContent && !deferOpenUntilFirstPage && modal.isClosed) {
              setContent();
            }
          },
        };
      }
    },
);
