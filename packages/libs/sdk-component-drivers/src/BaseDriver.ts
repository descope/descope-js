import { waitFor } from './helpers';
import { DriverElements, DriverElement, Empty, ElementsProxy } from './types';

type Logger = {
  error(...data: any[]): void;
  warn(...data: any[]): void;
  info(...data: any[]): void;
  debug(...data: any[]): void;
};

const singleMultiValue = (arr: any[]) => (arr.length === 1 ? arr[0] : arr);

const createProxy = (elements: Element[]): ElementsProxy => {
  return new Proxy(
    {},
    {
      get(_, prop, receiver) {
        if (prop === Symbol.iterator) {
          // Allow: for (const el of $items) { ... }
          return function* () {
            yield* elements;
          };
        }
        if (prop === '__list') return elements;

        if (elements.every((el) => typeof el[prop] === 'function')) {
          return (...args) =>
            singleMultiValue(elements.map((el) => el[prop].apply(el, args)));
        }

        return singleMultiValue(elements.map((el) => el[prop]));
      },

      set(_, prop, val) {
        elements.forEach((el) => {
          el[prop] = val;
        });
        return true;
      },

      has(_, prop) {
        return elements.every((e) => prop in e);
      },
    },
  ) as ElementsProxy;
};

export class BaseDriver<
  T extends DriverElement | DriverElements = DriverElement,
> {
  #ele: T;

  logger: Logger | undefined;

  // eslint-disable-next-line class-methods-use-this
  nodeName = '';

  constructor(refOrRefFn: T, config: { logger: Logger }) {
    this.#ele = refOrRefFn;
    this.logger = config.logger;
  }

  get asyncEle() {
    return waitFor(() => this.ele, 1000);
  }

  get ele(): T extends DriverElement ? Element : ElementsProxy {
    const ele = typeof this.#ele === 'function' ? this.#ele() : this.#ele;

    const elements =
      ele instanceof Element
        ? [ele]
        : ele instanceof NodeList
          ? Array.from(ele)
          : [];

    if (elements.length === 0) {
      this.logger?.debug(
        `Driver elements are not available for ${this.nodeName}`,
        new Error(),
      );
    }

    const filteredEles = elements.filter((e) => e.localName === this.nodeName);
    if (filteredEles.length !== elements.length) {
      this.logger?.debug(
        `node name do not match, expected "${
          this.nodeName
        }", received "${elements.map((e) => e.localName).join(', ')}" `,
        Error(),
      );
    }

    return createProxy(filteredEles) as T extends DriverElement
      ? Element
      : ElementsProxy;
  }

  _filter(cb: (el: Element, index?: number) => boolean): this {
    return new (this.constructor as any)(
      () => (this.ele as ElementsProxy).__list.filter(cb),
      { logger: this.logger },
    );
  }

  _find(cb: (el: Element, index?: number) => boolean): this {
    return new (this.constructor as any)(
      () => (this.ele as ElementsProxy).__list.find(cb) || [],
      { logger: this.logger },
    );
  }

  _length() {
    return (this.ele as ElementsProxy).__list.length;
  }

  _addEventListener(
    type: string,
    cb: (e: Event, targetDriver: this) => void,
    options?: boolean | AddEventListenerOptions,
  ): () => void {
    const ele = this.ele;
    const onEvent = (e) => {
      cb(
        e,
        this._find((el) => el === e.target),
      );
    };
    ele?.addEventListener(type, onEvent, options);

    return () => ele?.removeEventListener(type, onEvent, options);
  }

  _getAttribute(
    name: string,
  ): T extends DriverElement ? string | null : (string | null)[] {
    const result = this.ele.getAttribute(name);
    return result as T extends DriverElement
      ? string | null
      : (string | null)[];
  }
}
