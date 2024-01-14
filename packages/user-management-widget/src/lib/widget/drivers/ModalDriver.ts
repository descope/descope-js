import { BaseDriver } from './BaseDriver';

// type EventCb = (e: Event) => void

export class ModalDriver extends BaseDriver {

  #modalContent: HTMLTemplateElement;

  // #modalEvents: { event: string, querySelector: string, cb: EventCb }[] = [];

  close() {
    this.ele?.removeAttribute('opened');
  }

  open() {
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
