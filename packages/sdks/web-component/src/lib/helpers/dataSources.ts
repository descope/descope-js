// Components hand the SDK their data source (see @descope/components-data-sources) with this
// event, and the SDK resolves a handle to it:
//   el.dispatchEvent(new CustomEvent('descope-data-source', {
//     detail: { dataSource, resolve }, bubbles: true, composed: true, cancelable: true }))
// The SDK calls preventDefault when it answers; an unanswered event means no host, or a data
// source the SDK refused.
export const DATA_SOURCE_EVENT = 'descope-data-source';
// comma separated names a component may use, e.g. "impersonation-login-ids,tenants"
export const DATA_SOURCE_ATTRIBUTE = 'data-descope-ds';
export const DATA_SOURCE_TIMEOUT_MS = 10000;

// Only flow data source endpoints, so a data source can't use the flow user's session (and
// nonce) against any other API.
const ENDPOINT_PATTERN = /^\/v1\/flow\/ds\/[a-z0-9-]+$/;
const NAME_PATTERN = /^[a-z0-9-]+$/;

type DSResponse = { ok: boolean; data?: unknown; error?: unknown };

type DSContext = {
  request: (body: Record<string, unknown>) => Promise<DSResponse>;
  executionId: string;
  stepId: string;
  componentId: string;
  componentType: string;
};

type DataSource = {
  name: string;
  endpoint: string;
  methods: Record<
    string,
    (ctx: DSContext, params: unknown) => Promise<unknown>
  >;
};

export type DataSourceHandle = Record<
  string,
  (params?: unknown) => Promise<{ data?: unknown; error?: string }>
>;

type Logger = {
  debug: (...args: any[]) => void;
  warn: (...args: any[]) => void;
};

export type DataSourcesDeps = {
  getFlowState: () => { executionId?: string; stepId?: string };
  post: (path: string, body: Record<string, unknown>) => Promise<Response>;
  logger: Logger;
};

export const getDeclaredNames = (el: Element): string[] => [
  ...new Set(
    (el.getAttribute(DATA_SOURCE_ATTRIBUTE) || '')
      .split(',')
      .map((name) => name.trim())
      .filter((name) => NAME_PATTERN.test(name)),
  ),
];

const isDataSource = (ds: any): ds is DataSource =>
  !!ds &&
  typeof ds.name === 'string' &&
  NAME_PATTERN.test(ds.name) &&
  typeof ds.endpoint === 'string' &&
  ENDPOINT_PATTERN.test(ds.endpoint) &&
  !!ds.methods &&
  typeof ds.methods === 'object';

const withTimeout = <T>(promise: Promise<T>, ms: number) => {
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Data source timed out')), ms);
    }),
  ]).finally(() => clearTimeout(timer));
};

// Runs the data sources components hand it, through the SDK http client. Data sources are
// stateless and isolated: one that throws only affects its own call.
export const createDataSources = (deps: DataSourcesDeps) => {
  const request = async (
    endpoint: string,
    body: Record<string, unknown>,
  ): Promise<DSResponse> => {
    try {
      const res = await deps.post(endpoint, body);
      const data = await res.json().catch(() => undefined);
      if (res.ok) return { ok: true, data };
      return {
        ok: false,
        data,
        error:
          data?.errorDescription || data?.errorCode || `HTTP ${res.status}`,
      };
    } catch (e) {
      return { ok: false, error: e?.message || 'Request failed' };
    }
  };

  const buildHandle = (ds: DataSource, el: Element): DataSourceHandle =>
    Object.freeze(
      Object.fromEntries(
        Object.entries(ds.methods)
          .filter(([, method]) => typeof method === 'function')
          .map(([methodName, method]) => [
            methodName,
            async (params?: unknown) => {
              // read at call time, so the handle follows the flow across screens
              const { executionId, stepId } = deps.getFlowState();
              const ctx: DSContext = {
                request: (body) => request(ds.endpoint, body),
                executionId,
                stepId,
                componentId: el.id,
                componentType: el.localName,
              };
              try {
                return {
                  data: await withTimeout(
                    Promise.resolve().then(() => method(ctx, params)),
                    DATA_SOURCE_TIMEOUT_MS,
                  ),
                };
              } catch (e) {
                deps.logger.warn(
                  `Data source "${ds.name}.${methodName}" failed`,
                  e?.message,
                );
                return { error: e?.message || String(e) };
              }
            },
          ]),
      ),
    );

  return {
    handleEvent(
      e: CustomEvent<{
        dataSource: unknown;
        resolve: (handle: DataSourceHandle | null) => void;
      }>,
    ) {
      const { dataSource, resolve } = e.detail || ({} as typeof e.detail);
      // composed events are retargeted to the screen element (the shadow host)
      const el = e.target as Element | null;
      if (typeof resolve !== 'function' || !el?.id) return;
      if (!isDataSource(dataSource)) {
        deps.logger.debug(`Refused an invalid data source from #${el.id}`);
        return;
      }
      // a component only gets what it declared on the screen
      if (!getDeclaredNames(el).includes(dataSource.name)) {
        deps.logger.debug(
          `Data source "${dataSource.name}" is not declared on #${el.id}`,
        );
        return;
      }
      e.preventDefault();
      resolve(buildHandle(dataSource, el));
    },
  };
};
