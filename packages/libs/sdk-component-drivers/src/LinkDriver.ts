import { BaseDriver } from './BaseDriver';

export class LinkDriver extends BaseDriver {
  nodeName = 'descope-link';

  get ele() {
    return super.ele as Element & {
      innerText: string;
      getAttribute: (name: string) => string | null;
    };
  }

  get href() {
    return this.ele?.getAttribute('href');
  }

  set href(href: string) {
    this.ele?.setAttribute('href', href ?? '');
  }
}
