import { BaseDriver } from './BaseDriver';
import { DriverElement, DriverElements } from './types';

export class AvatarDriver<
  T extends DriverElement | DriverElements = DriverElement,
> extends BaseDriver<T> {
  nodeName = 'descope-avatar';

  set displayName(name: string) {
    this.ele.setAttribute('display-name', name);
  }

  set image(imgUrl: string) {
    this.ele.setAttribute('img', imgUrl);
  }

  get flowId() {
    return this._getAttribute('flow-id');
  }

  onClick(cb: (e: Event) => void) {
    return this._addEventListener('click', cb);
  }
}
