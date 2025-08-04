/* eslint-disable no-nested-ternary */

type SdkHeaders = HeadersInit | Record<string, () => string>;

const getSrcArr = (source: SdkHeaders) => {
  if (Array.isArray(source)) return source;
  if (source instanceof Headers) return Array.from(source.entries());
  if (!source) return [];
  return Object.entries(source);
};

/** Merge the given list of headers into a single Headers object */
export const mergeHeaders = (...sources: SdkHeaders[]) =>
  new Headers(
    sources.reduce<Record<string, string>>(
      (acc: Record<string, string>, source) => {
        getSrcArr(source).forEach(([key, value]) => {
          acc[key] = typeof value === 'function' ? value() : value;
        });

        return acc;
      },
      {},
    ),
  );

/** Serialize the body to JSON */
export const serializeBody = (body: Record<string, any>) =>
  body === undefined ? undefined : JSON.stringify(body);
