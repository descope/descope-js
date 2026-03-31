import { BaseDriver } from './BaseDriver';

export class LastAuthBadgeDriver extends BaseDriver {
  nodeName = 'descope-last-auth-badge';

  set anchor(element: HTMLElement | null) {
    if (this.ele) (this.ele as any).anchor = element;
  }

  set position(value: string) {
    this.ele?.setAttribute('position', value);
  }

  get position() {
    return this.ele?.getAttribute('position') ?? '';
  }
}
