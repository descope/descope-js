import type { Page } from '@playwright/test';

/**
 * A widget dispatches `ready` on itself once init() has attached its component
 * listeners. Before that the elements exist but nothing is listening, so events
 * a test dispatches are dropped.
 *
 * `ready` does not bubble, so it can only be caught on the element itself. We
 * wrap `document.createElement` to attach the listener at creation time, which
 * is the only point guaranteed to be before `ready` can fire.
 *
 * This lives here and not in each widget's `src/app/index.html` because those
 * files are public reference code that customers copy.
 */

const READY_FLAG = '__descopeWidgetReady';
const ERRORS_FLAG = '__descopeWidgetErrors';

// Page crashes and uncaught exceptions, kept per page so a timeout can say why
// the widget never became ready.
const pageErrors = new WeakMap<Page, string[]>();

const listenForWidgetReady = async (page: Page): Promise<void> => {
  const errors: string[] = [];
  pageErrors.set(page, errors);
  page.on('pageerror', (err) => {
    errors.push(err.message);
  });

  await page.addInitScript(
    ([readyFlag, errorsFlag]: [string, string]) => {
      const w = window as unknown as Record<string, unknown>;

      // false, not undefined, so a timeout can tell "never set up" apart from
      // "set up, but the widget never became ready".
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

// A ceiling, not a delay - it returns as soon as `ready` fires. 10s timed out
// 10 times in one CI run while always passing locally: init fetches root.html,
// the components bundle and several API responses, under 4 workers x 3 browsers.
const DEFAULT_READY_TIMEOUT = 30_000;

const waitForWidgetReady = async (
  page: Page,
  { timeout = DEFAULT_READY_TIMEOUT }: { timeout?: number } = {},
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
        ? 'listenForWidgetReady(page) was never called on this page. Call it in beforeEach, before page.goto().'
        : `the widget did not dispatch "ready" within ${timeout}ms, so its init() never finished. Usual causes: a request the spec forgot to stub, the components bundle failing to load, or a widget that renders an error state instead of becoming ready.`;

    throw new Error(
      `waitForWidgetReady: ${reason}${
        seen.length ? `\nErrors seen on the page:\n  ${seen.join('\n  ')}` : ''
      }`,
    );
  }
};

export { listenForWidgetReady, waitForWidgetReady };
