export type HeadersMap = Record<string, string>;

export const XHR_METADATA = Symbol('network-plugin-metadata');

export interface XhrMetadata {
  method?: string;
  url?: string;
  startTime?: number;
  requestHeaders: HeadersMap;
}

export type XhrWithMeta = XMLHttpRequest & {
  [XHR_METADATA]?: XhrMetadata;
};
