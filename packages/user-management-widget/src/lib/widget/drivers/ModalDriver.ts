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

    // this.#modalEvents.forEach(({ event, querySelector, cb }) => {
    //   this.attachModalEvent(event, querySelector, cb);
    // });
  }

  setContent(template: HTMLTemplateElement) {
    this.#modalContent = template;
    this.reset();
  }

  getInputs(): HTMLInputElement[] {
    return this.getElements('[name]') as HTMLInputElement[];
  }

  getElements(querySelector: string) {
    return Array.from(this.ele?.querySelectorAll(querySelector) || []) as HTMLElement[];
  }

  getFormData(): any {
    return this.getInputs().reduce((acc, input) => Object.assign(acc, { [input.getAttribute('name')!]: input.value }), {});
  }

  setFormData(data: Record<string, any>) {
    this.getInputs().forEach(input => {
      // eslint-disable-next-line no-param-reassign
      input.value = data[input.getAttribute('name')!];
    });
  }

  resetFormData() {
    this.getInputs().forEach(input => {
      // eslint-disable-next-line no-param-reassign
      input.value = '';
    });
  }

  // attachModalEvent(event: string, querySelector: string, cb: EventCb) {
  //   this.getModalElements(querySelector).forEach((ele: HTMLElement) => {
  //     ele.addEventListener(event, cb);
  //   });

  //   const modalEvent = { event, querySelector, cb };
  //   const idx = this.#modalEvents.push(modalEvent);

  //   return () => {
  //     this.getModalElements(querySelector).forEach((ele: HTMLElement) => {
  //       ele?.removeEventListener(event, cb);
  //     });

  //     this.#modalEvents.splice(idx, 1);
  //   };
  // }

  remove() {
    this.ele?.remove();
  }
}
