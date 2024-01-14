import { Logger } from '../../mixins/loggerMixin/types';

type RefOrRefFn = Element | (() => HTMLElement)

export class BaseDriver {

  #ele: RefOrRefFn;

  logger: Logger | undefined;

  constructor(refOrRefFn: RefOrRefFn, config: { logger: Logger }) {
    this.#ele = refOrRefFn;
    this.logger = config.logger;
  }

  get ele() {
    const ele = typeof this.#ele === 'function' ? this.#ele() : this.#ele;
    if (!ele) this.logger?.debug(`no element for driver `, this);

    return ele;
  }
}
