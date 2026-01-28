import { SingleSelectDriver } from './SingleSelectDriver';

export class TenantSelectorDriver extends SingleSelectDriver {
  get action(): 'reload' | 'none' | '' {
    return (this.ele?.getAttribute('data-action') || '') as
      | 'reload'
      | 'none'
      | '';
  }

  get refreshTimeout(): number {
    return Number(this.ele?.getAttribute('data-refresh-timeout')) || 500;
  }

  get shouldReload() {
    return this.action === 'reload';
  }
}
