import { BaseDriver } from './BaseDriver';

type PasskeyType =
  | 'apple'
  | 'google'
  | 'windows'
  | 'chrome'
  | 'edge'
  | 'samsung'
  | '1password'
  | 'bitwarden'
  | 'lastpass'
  | 'dashlane'
  | 'keeper'
  | 'keepassxc'
  | 'proton'
  | 'nordpass'
  | 'enpass'
  | 'key'
  | 'phone'
  | 'other';

type Data = {
  id: string;
  name: string;
  passkeyType: PasskeyType;
  createdAt: number;
}[];

type Detail = { id: string; action: string };

export class UserPasskeysDriver extends BaseDriver {
  nodeName = 'descope-user-passkeys';

  get ele() {
    return super.ele as Element & {
      data: Data;
    };
  }

  get data() {
    return this.ele?.data;
  }

  set data(data: Data) {
    if (this.ele) this.ele.data = data;
  }

  get addPasskeyFlowId() {
    return this.ele?.getAttribute('add-passkey-flow-id');
  }

  get removePasskeyFlowId() {
    return this.ele?.getAttribute('remove-passkey-flow-id');
  }

  onAddPasskeyClick(cb: (e: Event) => void) {
    this.ele?.addEventListener('add-passkey-clicked', cb);
    return () => this.ele?.removeEventListener('add-passkey-clicked', cb);
  }

  onRemovePasskeyClick(cb: (detail: Detail) => void) {
    const handler = (e: CustomEvent<Detail>) => cb(e.detail);
    this.ele?.addEventListener('remove-passkey-clicked', handler);

    return () =>
      this.ele?.removeEventListener('remove-passkey-clicked', handler);
  }
}
