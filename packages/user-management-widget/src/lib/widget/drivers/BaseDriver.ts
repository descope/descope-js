import { Logger } from '../../mixins/loggerMixin/types';
import { waitForElement } from './helpers';
import { RefOrRefFn } from './types';

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
        `no element for driver `,
        this.constructor.name,
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
