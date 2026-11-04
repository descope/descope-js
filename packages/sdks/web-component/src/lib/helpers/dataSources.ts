import { IS_LOCAL_STORAGE } from '../constants/general';

// Components ask for a data source by name with this event, and the SDK resolves a handle:
//   el.dispatchEvent(new CustomEvent('descope-data-source', {
//     detail: { name, resolve }, bubbles: true, composed: true, cancelable: true }))
// The SDK calls preventDefault when it answers; an unanswered event means no host.
export const DATA_SOURCE_EVENT = 'descope-data-source';
// comma separated names a component may ask for, e.g. "impersonation-login-ids,tenants"
export const DATA_SOURCE_ATTRIBUTE = 'data-descope-ds';
export const DATA_SOURCES_LIB_NAME = '@descope/components-data-sources';
// ponytail: pinned like flow-scripts; config.json componentsDataSourcesVersion overrides it per project
export const DATA_SOURCES_VERSION = '1.0.0';
// dev override, a local build of the package (like base.ui.components.url)
export const DATA_SOURCES_URL_KEY = 'base.ds.url';
export const DATA_SOURCE_TIMEOUT_MS = 10000;

// Only flow data source endpoints, so a data source can't use the flow user's session (and
// nonce) against any other API.
const ENDPOINT_PATTERN = /^\/v1\/flow\/ds\/[a-z0-9-]+$/;
const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;
// The name ends up in a script path, so it is restricted to [a-z0-9-]
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
  error: (...args: any[]) => void;
};

export type DataSourcesDeps = {
  injectNpmLib: (
    libName: string,
    version: string,
    filePath: string,
    overrides: string[],
  ) => Promise<unknown>;
  // the per project override from config.json, if any
  getVersion: () => Promise<string | undefined>;
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

const isDataSource = (ds: any, name: string): ds is DataSource =>
  !!ds &&
  ds.name === name &&
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

const localOverride = () => {
  try {
    return (
      (IS_LOCAL_STORAGE && localStorage.getItem(DATA_SOURCES_URL_KEY)) || ''
    );
  } catch {
    return '';
  }
};

// Loads data sources on demand and hands components a handle to them. Data sources are
// stateless and isolated: one that fails to load, or throws, only affects itself.
export const createDataSources = (deps: DataSourcesDeps) => {
  const loading = new Map<string, Promise<DataSource | null>>();

  const loadVersion = async (
    name: string,
    version: string,
  ): Promise<DataSource | null> => {
    const path = `dist/${name}.js`;
    const local = localOverride();
    try {
      // ponytail: no SRI yet, the package isn't published; pass one per file before release
      await deps.injectNpmLib(
        DATA_SOURCES_LIB_NAME,
        version,
        path,
        local ? [`${local.replace(/\/$/, '')}/${path}`] : [],
      );
    } catch (e) {
      deps.logger.error(
        `Data source "${name}" not found in ${DATA_SOURCES_LIB_NAME}@${version}`,
        e?.message,
      );
      return null;
    }
    const ds = globalThis.descope?.dataSources?.[name];
    if (!isDataSource(ds, name)) {
      deps.logger.error(
        `Data source "${name}" in ${DATA_SOURCES_LIB_NAME}@${version} is invalid`,
      );
      return null;
    }
    return ds;
  };

  const doLoad = async (name: string): Promise<DataSource | null> => {
    let override: string | undefined;
    try {
      override = await deps.getVersion();
    } catch {
      // the pinned version still works without the project config
    }
    // it ends up in the script URL, so only an exact version
    if (
      !VERSION_PATTERN.test(override || '') ||
      override === DATA_SOURCES_VERSION
    ) {
      return loadVersion(name, DATA_SOURCES_VERSION);
    }
    // Each data source file stands alone, so a project pinned to a version that lacks this one
    // can still load it from the version the SDK pins
    const ds = await loadVersion(name, override);
    if (ds) return ds;
    deps.logger.warn(
      `Project data sources version ${override} has no "${name}", loading it from ${DATA_SOURCES_VERSION}`,
    );
    return loadVersion(name, DATA_SOURCES_VERSION);
  };

  const load = (name: string) => {
    if (!loading.has(name)) {
      const promise = doLoad(name).then((ds) => {
        // let a later screen try again
        if (!ds) loading.delete(name);
        return ds;
      });
      loading.set(name, promise);
    }
    return loading.get(name);
  };

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
    // starts loading what the rendered screen declares, so it's ready when asked for
    preload(root: Element) {
      root
        .querySelectorAll(`[${DATA_SOURCE_ATTRIBUTE}]`)
        .forEach((el) => getDeclaredNames(el).forEach(load));
    },

    handleEvent(
      e: CustomEvent<{
        name: string;
        resolve: (handle: DataSourceHandle | null) => void;
      }>,
    ) {
      const { name, resolve } = e.detail || ({} as typeof e.detail);
      // composed events are retargeted to the screen element (the shadow host)
      const el = e.target as Element | null;
      if (typeof resolve !== 'function' || typeof name !== 'string' || !el?.id)
        return;
      // a component only gets what it declared on the screen
      if (!getDeclaredNames(el).includes(name)) {
        deps.logger.debug(`Data source "${name}" is not declared on #${el.id}`);
        return;
      }
      e.preventDefault();
      load(name).then((ds) => resolve(ds ? buildHandle(ds, el) : null));
    },
  };
};
