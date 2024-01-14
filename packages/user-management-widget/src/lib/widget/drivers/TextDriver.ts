import { BaseDriver } from './BaseDriver';

export class TextDriver extends BaseDriver {
  get ele() {
    return super.ele as Element & { innerText: string };
  }

  get text() {
    return this.ele?.innerText;
  }

  set text(content: string) {
    if (this.ele) this.ele.innerText = content;
  }
}
