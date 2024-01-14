import { BaseDriver } from './BaseDriver';

export class TextFieldDriver extends BaseDriver {
  onInput(cb: (e: InputEvent) => void) {
    this.ele?.addEventListener('input', cb);

    return () => this.ele?.removeEventListener('input', cb);
  }
}
