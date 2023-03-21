/* eslint-disable no-nested-ternary */

const getSrcArr = (source: HeadersInit) => {
  if (Array.isArray(source)) return source;
  if (source instanceof Headers) return Array.from(source.entries());
  if (!source) return [];
  return Object.entries(source);
};

/** Merge the given list of headers into a single Headers object */
export const mergeHeaders = (...sources: HeadersInit[]) =>
  new Headers(
    sources.reduce((acc: Record<string, string>, source) => {
      const srcArr = getSrcArr(source);
      srcArr.reduce((_, [key, value]) => {
        acc[key] = value;

        return acc;
      }, acc);

      return acc;
    }, {})
  );

/** Serialize the body to JSON */
export const serializeBody = (body: Record<string, any>) =>
  body === undefined ? undefined : JSON.stringify(body);
