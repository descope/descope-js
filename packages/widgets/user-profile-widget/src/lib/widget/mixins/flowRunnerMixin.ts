import { FlowDriver, FlowPopupDriver } from '@descope/sdk-component-drivers';
import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import {
  loggerMixin,
  flowModalMixin,
  flowInputMixin,
} from '@descope/sdk-mixins';
import { flowSyncThemeMixin } from './flowSyncThemeMixin';
import { flowPopupSessionMixin } from './flowPopupSessionMixin';

// per-open flow inputs, e.g. the specific passkey being removed
export type FlowRunnerInputs = {
  form?: Record<string, any>;
  client?: Record<string, any>;
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
  onSuccess?: () => void;
};

export type FlowRunner = {
  open(inputs?: FlowRunnerInputs): void;
  close(): void;
  remove(): void;
};

// descope-wc attribute -> popup query parameter. These names are auth-hosting's
// existing ones, so pointing the popup at auth-hosting in Phase 2 is a change
// of base url rather than of contract. The one difference is the project id:
// auth-hosting takes it from the path, the POC page takes it as a param.
const ATTR_TO_PARAM: Record<string, string> = {
  'flow-id': 'flow',
  'project-id': 'project',
  theme: 'theme',
  'style-id': 'style',
  locale: 'locale',
  tenant: 'tenant',
};

// JSON object attributes, expanded as `client.<key>` / `form.<key>`
const OBJECT_ATTRS = ['client', 'form'];

/**
 * Turns the flow template's `<descope-wc>` into a popup url.
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
  popupUrl: string,
  flowEle: Element | null,
  onParseError?: (attr: string, raw: string) => void,
): string => {
  const url = new URL(popupUrl);

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

  return url.toString();
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
      // composed here rather than in initMixin on purpose: the runner is the
      // only caller of onFlowPopupClosed, so this keeps the dependency local
      // and, more practically, initMixin's compose chain is already at
      // TypeScript's inference limit - a 25th link there makes the whole chain
      // stop being assignable to Mixin
      flowPopupSessionMixin,
    )(superclass) {
      // POC only. Phase 2 replaces both with config.json values - `flowTarget`
      // per widget and `authHostingBaseUrl` per project - without changing
      // anything below.
      get #flowTarget(): string {
        return this.getAttribute('flow-target') || 'modal';
      }

      get #flowPopupUrl(): string {
        return this.getAttribute('flow-popup-url') || '';
      }

      #buildPopupUrl(flowId: string, inputs?: FlowRunnerInputs): string {
        const template = this.createFlowTemplate({ flowId, ...inputs });
        return buildFlowPopupUrl(
          this.#flowPopupUrl,
          template.content.querySelector('descope-wc'),
          (attr, raw) =>
            this.logger?.error(`Could not parse flow ${attr} inputs`, raw),
        );
      }

      #createPopupRunner(
        flowId: string,
        onSuccess?: () => void,
      ): FlowRunner | undefined {
        if (!this.#flowPopupUrl) {
          this.logger?.error(
            'flow-target is "popup" but flow-popup-url is not set, falling back to a modal',
          );
          return undefined;
        }

        const popup = new FlowPopupDriver({ logger: this.logger });
        popup.onDone(() => onSuccess?.());
        // the flow may have changed the user before the window went away, so
        // the parent re-checks its session on every close, not just on success
        popup.onClosed(() => (this as any).onFlowPopupClosed?.());
        popup.onDone(() => (this as any).onFlowPopupClosed?.());

        return {
          // no awaiting before open() - the browser blocks a popup that is not
          // opened straight from the user gesture
          open: (inputs?: FlowRunnerInputs) =>
            popup.open(this.#buildPopupUrl(flowId, inputs)),
          close: () => popup.close(),
          remove: () => popup.remove(),
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

        // setContent replaces the element, so the success listener is attached
        // to the new one each time rather than accumulating on an old one
        const setContent = (inputs?: FlowRunnerInputs) => {
          modal.setContent(this.createFlowTemplate({ flowId, ...inputs }));
          flow.onSuccess(() => {
            modal.close();
            onSuccess?.();
          });
        };

        if (presetContent) {
          modal.afterClose = () => setContent();
          setContent();
        }

        return {
          open: (inputs?: FlowRunnerInputs) => {
            if (inputs || !presetContent) setContent(inputs);
            modal.open();
          },
          close: () => modal.close(),
          remove: () => modal.remove(),
        };
      }
    },
);
