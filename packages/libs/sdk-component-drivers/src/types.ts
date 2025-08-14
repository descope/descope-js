export type Empty = null | undefined;

export type DriverEle = Element | Empty;
type DriverEleGetter = () => DriverEle;

export type DriverEles = NodeListOf<Element>;
type DriverElesGetter = () => DriverEles;

export type DriverElement = DriverEle | DriverEleGetter;
export type DriverElements = DriverEles | DriverElesGetter;

// Type for the proxy returned by handleNodeList
export type ElementsProxy = {
  readonly length: number;
  [Symbol.iterator](): IterableIterator<Element>;
  __list: Element[];
} & {
  // All properties that exist on Element, but as arrays of those properties
  [K in keyof Element]: Element[K] extends (...args: any[]) => any
    ? (...args: Parameters<Element[K]>) => ReturnType<Element[K]>[]
    : Element[K][];
};
