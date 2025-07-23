import { BaseDriver } from './BaseDriver';

export class UserAuthMethodDriver extends BaseDriver {
  nodeName = 'descope-user-auth-method';

  set fulfilled(isFulfilled: boolean) {
    isFulfilled
      ? this.ele?.setAttribute('fulfilled', 'true')
      : this.ele?.removeAttribute('fulfilled');
  }

  onUnfulfilledButtonClick(cb: (e: Event) => void) {
    this.ele?.addEventListener('button-clicked', cb);

    return () => this.ele?.removeEventListener('button-clicked', cb);
  }

  onFulfilledButtonClick(cb: (e: Event) => void) {
    this.ele?.addEventListener('fulfilled-button-clicked', cb);

    return () => this.ele?.removeEventListener('fulfilled-button-clicked', cb);
  }

  get flowId() {
    return this.ele?.getAttribute('flow-id');
  }

  get fulfilledFlowId() {
    return this.ele?.getAttribute('fulfilled-flow-id');
  }
}
