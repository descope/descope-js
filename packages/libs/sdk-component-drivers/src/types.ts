type Empty = null | undefined;

export type RefOrRefFn = Element | (() => HTMLElement | Empty) | Empty;
