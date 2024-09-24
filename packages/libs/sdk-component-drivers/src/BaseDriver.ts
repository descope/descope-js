import { waitForElement } from './helpers';
import { RefOrRefFn } from './types';

type Logger = {
  error?(message?: any, ...optionalParams: any[]): void;
  warn?(message?: any, ...optionalParams: any[]): void;
  info?(message?: any, ...optionalParams: any[]): void;
  debug?(message?: any, ...optionalParams: any[]): void;
};

export class BaseDriver {
  #ele: RefOrRefFn;

  logger: Logger | undefined;

  // eslint-disable-next-line class-methods-use-this
  nodeName = '';

  constructor(refOrRefFn: RefOrRefFn, config: { logger: Logger }) {
    this.#ele = refOrRefFn;
    this.logger = config.logger;
  }

  get asyncEle() {
    return waitForElement(this.#ele, 1000);
  }

  get ele() {
    const ele = typeof this.#ele === 'function' ? this.#ele() : this.#ele;
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
}
