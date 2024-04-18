import { BaseDriver } from './BaseDriver';

export class AvatarDriver extends BaseDriver {
  nodeName = 'descope-avatar';

  set displayName(name: string) {
    this.ele?.setAttribute('display-name', name);
  }

  set image(imgUrl: string) {
    this.ele?.setAttribute('img', imgUrl);
  }

  get flowId() {
    return this.ele?.getAttribute('flow-id');
  }

  onClick(cb: (e: Event) => void) {
    this.ele?.addEventListener('click', cb);

    return () => this.ele?.removeEventListener('click', cb);
  }
}
