import { BaseDriver } from './BaseDriver';

export class LastAuthBadgeDriver extends BaseDriver {
  nodeName = 'descope-attachment';

  set position(value: string) {
    this.ele?.setAttribute('position', value);
  }

  get position() {
    return this.ele?.getAttribute('position') ?? '';
  }
}
