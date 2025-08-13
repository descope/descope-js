import { waitFor } from './helpers';
import { DriverElements, DriverElement, Empty, ElementsProxy } from './types';

type Logger = {
  error(...data: any[]): void;
  warn(...data: any[]): void;
  info(...data: any[]): void;
  debug(...data: any[]): void;
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

  #handleSingleElement(ele: Element | Empty) {
    if (!ele) {
      this.logger?.debug(
        `Driver element is not available for ${this.nodeName}`,
        new Error(),
      );

      return null;
    }

    if (ele?.localName !== this.nodeName) {
      this.logger?.debug(
        `node name do not match, expected "${this.nodeName}", received "${ele.localName}" `,
        Error(),
      );

      return null;
    }

    return ele;
  }

  handleMultiElements(ele: NodeListOf<Element> | Empty): ElementsProxy | null {
    if (!ele || ele.length === 0) {
      this.logger?.debug(
        `Driver elements are not available for ${this.nodeName}`,
        new Error(),
      );
      return null;
    }

    const eles = Array.from(ele);

    if (eles.some((e) => e.localName !== this.nodeName)) {
      this.logger?.debug(
        `node name do not match, expected "${this.nodeName}", received "${eles
          .map((e) => e.localName)
          .join(', ')}" `,
        Error(),
      );

      return null;
    }

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
            if (prop === 'length') return elements.length;

            if (prop === 'filter') {
              return (cb: (el: Element) => boolean) => {
                const filteredEles = elements.filter(cb);
                return createProxy(filteredEles);
              };
            }

            if (elements.every((el) => typeof el[prop] === 'function')) {
              return (...args) =>
                elements.map((el) => el[prop].apply(el, args));
            }

            return elements.map((el) => el[prop]);
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

    return createProxy(eles);
  }

  get ele(): T extends DriverElement ? Element | null : ElementsProxy | null {
    const ele = typeof this.#ele === 'function' ? this.#ele() : this.#ele;

    if (ele instanceof Element) {
      return this.#handleSingleElement(ele) as T extends DriverElement
        ? Element | null
        : ElementsProxy | null;
    } else if (ele instanceof NodeList) {
      return this.handleMultiElements(ele) as T extends DriverElement
        ? Element | null
        : ElementsProxy | null;
    }
    return null;
  }
}
