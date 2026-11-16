// A component asks the SDK for a data source by name with this event:
//   el.dispatchEvent(new CustomEvent('descope-data-source', {
//     detail: { name, resolve }, bubbles: true, composed: true, cancelable: true }))
// The SDK answers (preventDefault) with request(body), which posts body to /v1/flow/ds/<name>
// with the flow execution and the component's identity, and resolves { ok, data, error } (it
// never rejects). The data source logic (query rules, response mapping) ships with the
// components (@descope/components-data-sources); the SDK only sends the request. The backend
// decides whether the component may use the data source (the screen's componentDataSources).
// An unanswered event means no host, or an invalid name.
export const DATA_SOURCE_EVENT = 'descope-data-source';

const NAME_PATTERN = /^[a-z0-9-]+$/;

export type DSResponse = { ok: boolean; data?: unknown; error?: unknown };

export type DataSourceRequest = (
  body?: Record<string, unknown>,
) => Promise<DSResponse>;

export type DataSourcesDeps = {
  getFlowState: () => { executionId?: string; stepId?: string };
  post: (path: string, body: Record<string, unknown>) => Promise<Response>;
  logger: { debug: (...args: any[]) => void };
};

export const createDataSources = (deps: DataSourcesDeps) => {
  const post = async (
    path: string,
    body: Record<string, unknown>,
  ): Promise<DSResponse> => {
    try {
      const res = await deps.post(path, body);
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

  return {
    handleEvent(
      e: CustomEvent<{
        name: unknown;
        resolve: (request: DataSourceRequest) => void;
      }>,
    ) {
      const { name, resolve } = e.detail || ({} as typeof e.detail);
      // composed events are retargeted to the screen element (the shadow host)
      const el = e.target as Element | null;
      if (typeof resolve !== 'function' || !el?.id) return;
      // a valid name is a single path segment, so the path below stays under /v1/flow/ds/
      if (typeof name !== 'string' || !NAME_PATTERN.test(name)) {
        deps.logger.debug(`Invalid data source name "${String(name)}"`);
        return;
      }
      e.preventDefault();
      const path = `/v1/flow/ds/${name}`;
      resolve((body) => {
        // read at call time, so the request follows the flow across screens
        const { executionId, stepId } = deps.getFlowState();
        return post(path, {
          ...body,
          executionId,
          stepId,
          componentId: el.id,
          componentType: el.localName,
        });
      });
    },
  };
};
