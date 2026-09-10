import type { Page } from '@playwright/test';

/**
 * Waiting for a widget to finish loading.
 *
 * Every widget dispatches a `ready` event on itself once `init()` has fetched
 * its root template, loaded the descope-ui components and run
 * `onWidgetRootReady()` - which is where the component event listeners get
 * attached. Until that happens the elements are in the DOM but nothing is
 * listening, so an event a test dispatches is silently dropped.
 *
 * `ready` is a plain `new CustomEvent('ready')`, so it does not bubble and can
 * only be observed on the element itself. The widget element is created by the
 * demo app with `document.createElement('descope-<name>-widget')`, so the probe
 * wraps `createElement` and attaches the listener at creation time - before the
 * element is even in the DOM, and therefore before `ready` can possibly fire.
 *
 * The probe lives here rather than in each widget's `src/app/index.html`
 * because those files are public reference code that customers copy.
 */

const READY_FLAG = '__descopeWidgetReady';
const ERRORS_FLAG = '__descopeWidgetErrors';

// Errors seen on the Node side (page crashes, uncaught exceptions), kept per
// page so a timeout can report why the widget never became ready.
const pageErrors = new WeakMap<Page, string[]>();

const installWidgetReadyProbe = async (page: Page): Promise<void> => {
  const errors: string[] = [];
  pageErrors.set(page, errors);
  page.on('pageerror', (err) => {
    errors.push(err.message);
  });

  await page.addInitScript(
    ([readyFlag, errorsFlag]: [string, string]) => {
      const w = window as unknown as Record<string, unknown>;

      // false (not undefined) so waitForWidgetReady can tell "probe missing"
      // apart from "probe installed, widget never became ready".
      w[readyFlag] = false;
      w[errorsFlag] = [] as string[];

      window.addEventListener('unhandledrejection', (event) => {
        const { reason } = event as PromiseRejectionEvent;
        (w[errorsFlag] as string[]).push(
          String((reason as Error)?.message ?? reason),
        );
      });

      const originalCreateElement = document.createElement.bind(document);
      document.createElement = function patchedCreateElement(
        this: Document,
        ...args: Parameters<Document['createElement']>
      ) {
        const element = originalCreateElement(...args);
        const [tagName] = args;
        if (
          typeof tagName === 'string' &&
          tagName.startsWith('descope-') &&
          tagName.endsWith('-widget')
        ) {
          element.addEventListener('ready', () => {
            w[readyFlag] = true;
          });
        }
        return element;
      } as Document['createElement'];
    },
    [READY_FLAG, ERRORS_FLAG] as [string, string],
  );
};

const waitForWidgetReady = async (
  page: Page,
  { timeout = 10_000 }: { timeout?: number } = {},
): Promise<void> => {
  try {
    await page.waitForFunction(
      (readyFlag) =>
        (window as unknown as Record<string, unknown>)[readyFlag] === true,
      READY_FLAG,
      { timeout },
    );
  } catch {
    const flag = await page
      .evaluate(
        (readyFlag) =>
          (window as unknown as Record<string, unknown>)[readyFlag],
        READY_FLAG,
      )
      .catch(() => undefined);

    const inPageErrors = await page
      .evaluate(
        (errorsFlag) =>
          ((window as unknown as Record<string, unknown>)[errorsFlag] ??
            []) as string[],
        ERRORS_FLAG,
      )
      .catch(() => [] as string[]);

    const seen = [...(pageErrors.get(page) ?? []), ...inPageErrors];

    const reason =
      flag === undefined
        ? 'the ready probe was never installed on this page. Call installWidgetReadyProbe(page) in beforeEach, before page.goto().'
        : `the widget did not dispatch "ready" within ${timeout}ms, so its init() never finished. Usual causes: a request the spec forgot to stub, the components bundle failing to load, or a widget that renders an error state instead of becoming ready.`;

    throw new Error(
      `waitForWidgetReady: ${reason}${
        seen.length ? `\nErrors seen on the page:\n  ${seen.join('\n  ')}` : ''
      }`,
    );
  }
};

export { installWidgetReadyProbe, waitForWidgetReady };
