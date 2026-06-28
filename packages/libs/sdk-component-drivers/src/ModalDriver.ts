import { BaseDriver } from './BaseDriver';

export class ModalDriver extends BaseDriver {
  #modalContent: HTMLTemplateElement;

  #openedObserver: MutationObserver | undefined;

  beforeOpen: undefined | (() => void | Promise<void>);

  afterClose: undefined | (() => void);

  nodeName = 'descope-modal';

  constructor(...args: ConstructorParameters<typeof BaseDriver>) {
    super(...args);
    this.#observeOpened();
  }

  // run afterClose whenever the modal becomes closed, regardless of how it was
  // closed - a programmatic close() or the component closing itself on a backdrop
  // click both just remove the `opened` attribute. observing the attribute keeps
  // the reset logic in one place instead of reacting to a specific trigger.
  #observeOpened() {
    if (this.#openedObserver) return;

    const ele = this.ele;
    if (!ele) return;

    this.#openedObserver = new MutationObserver((records) => {
      records.forEach((record, index) => {
        const wasOpen = record.oldValue === 'true';
        // the value after this mutation is the next record's oldValue, or the
        // current attribute value for the last record in the batch
        const valueAfter = records[index + 1]
          ? records[index + 1].oldValue
          : ele.getAttribute('opened');

        if (wasOpen && valueAfter !== 'true') {
          this.afterClose?.();
        }
      });
    });

    this.#openedObserver.observe(ele, {
      attributes: true,
      attributeFilter: ['opened'],
      attributeOldValue: true,
    });
  }

  close() {
    // removing `opened` triggers the observer above, which runs afterClose
    this.ele?.removeAttribute('opened');
  }

  async open() {
    await this.beforeOpen?.();
    // set up the observer lazily too, in case the element wasn't available yet
    // when the driver was constructed
    this.#observeOpened();
    this.ele?.setAttribute('opened', 'true');
  }

  reset() {
    if (this.ele) this.ele.innerHTML = '';
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    this.#modalContent &&
      this.ele?.append(this.#modalContent.content.cloneNode(true));
  }

  setContent(template: HTMLTemplateElement) {
    this.#modalContent = template;
    this.reset();
  }

  remove() {
    this.#openedObserver?.disconnect();
    this.ele?.remove();
  }
}
