import { BaseDriver } from './BaseDriver';

export class TextFieldDriver extends BaseDriver {
  nodeName = 'descope-text-field';

  onInput(cb: (e: InputEvent) => void) {
    this.ele?.addEventListener('input', cb);

    return () => this.ele?.removeEventListener('input', cb);
  }

  get value() {
    return (<HTMLInputElement>this.ele)?.value;
  }

  set value(value: string) {
    if (this.ele) {
      (<HTMLInputElement>this.ele).value = value;
    }
  }

  disable() {
    this.ele?.setAttribute('disabled', 'true');
  }

  enable() {
    this.ele?.removeAttribute('disabled');
  }
}
