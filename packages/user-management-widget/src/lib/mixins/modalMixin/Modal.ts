type EventCb = (e: Event) => void

export class Modal {

  #modalEle: HTMLElement;

  #modalContent: DocumentFragment;

  #modalEvents: { event: string, querySelector: string, cb: EventCb }[] = [];

  constructor(modalRef: HTMLElement) {
    this.#modalEle = modalRef;
  }

  get modal() {
    return this.#modalEle;
  }

  closeModal() {
    this.modal.removeAttribute('opened');
  }

  showModal() {
    this.modal.setAttribute('opened', 'true');
  }

  resetModal() {
    this.modal.innerHTML = '';
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    this.#modalContent && this.modal.append(this.#modalContent.cloneNode(true));

    this.#modalEvents.forEach(({ event, querySelector, cb }) => {
      this.attachModalEvent(event, querySelector, cb);
    });
  }

  setModalContent(template: DocumentFragment) {
    this.#modalContent = template;
    this.resetModal();
  }

  getModalInputs(): HTMLInputElement[] {
    return this.getModalElements('[name]') as HTMLInputElement[];
  }

  getModalElements(querySelector: string) {
    return Array.from(this.modal?.querySelectorAll(querySelector) || []) as HTMLElement[];
  }

  getModalFormData() {
    return this.getModalInputs().reduce((acc, input) => Object.assign(acc, { [input.getAttribute('name')!]: input.value }), {});
  }

  setModalFormData(data: Record<string, any>) {
    this.getModalInputs().forEach(input => {
      // eslint-disable-next-line no-param-reassign
      input.value = data[input.getAttribute('name')!];
    });
  }

  attachModalEvent(event: string, querySelector: string, cb: EventCb) {
    this.getModalElements(querySelector).forEach((ele: HTMLElement) => {
      ele.addEventListener(event, cb);
    });

    const modalEvent = { event, querySelector, cb };
    const idx = this.#modalEvents.push(modalEvent);

    return () => {
      this.getModalElements(querySelector).forEach((ele: HTMLElement) => {
        ele.removeEventListener(event, cb);
      });

      this.#modalEvents.splice(idx, 1);
    };
  }
}
