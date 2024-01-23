import { BaseDriver } from './BaseDriver';

export class ModalDriver extends BaseDriver {

  #modalContent: HTMLTemplateElement;

  beforeOpen: undefined | (() => void);

  afterClose:  undefined | (() => void);

  nodeName = 'descope-modal';

  close() {
    this.ele?.removeAttribute('opened');
    this.afterClose?.();
  }

  open() {
    this.beforeOpen?.();
    this.ele?.setAttribute('opened', 'true');
  }

  reset() {
    if (this.ele) this.ele.innerHTML = '';
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    this.#modalContent && this.ele?.append(this.#modalContent.content.cloneNode(true));
  }

  setContent(template: HTMLTemplateElement) {
    this.#modalContent = template;
    this.reset();
  }

  remove() {
    this.ele?.remove();
  }
}
