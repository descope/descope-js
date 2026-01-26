import { SingleSelectDriver } from './SingleSelectDriver';

export class TenantSelectorDriver extends SingleSelectDriver {
  nodeName = 'descope-tenant-selector';

  get action(): 'reload' | 'none' | '' {
    return (this.ele?.getAttribute('action') || '') as 'reload' | 'none' | '';
  }

  get refreshTimeout(): number {
    return Number(this.ele?.getAttribute('refresh-timeout')) || 500;
  }

  get shouldReload() {
    return this.action === 'reload';
  }
}
