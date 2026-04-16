import { BaseDriver } from './BaseDriver';

export class UserPasskeysDriver extends BaseDriver {
  nodeName = 'descope-user-passkeys';

  get flowId() {
    return this.ele?.getAttribute('flow-id');
  }

  get fulfilledFlowId() {
    return this.ele?.getAttribute('fulfilled-flow-id');
  }

  onAddPasskeyClick(cb: (e: Event) => void) {
    this.ele?.addEventListener('add-passkey-clicked', cb);
    return () => this.ele?.removeEventListener('add-passkey-clicked', cb);
  }

  onRemovePasskeyClick(cb: (e: Event) => void) {
    this.ele?.addEventListener('remove-passkey-clicked', cb);
    return () => this.ele?.removeEventListener('remove-passkey-clicked', cb);
  }
}
