import { BaseDriver } from './BaseDriver';

export class ButtonDriver extends BaseDriver {
  nodeName = 'descope-button';

  onClick(cb: (e: Event) => void) {
    this.ele?.addEventListener('click', cb);

    return () => this.ele?.removeEventListener('click', cb);
  }

  disable() {
    this.ele?.setAttribute('disabled', 'true');
  }

  enable() {
    this.ele?.removeAttribute('disabled');
  }
}
