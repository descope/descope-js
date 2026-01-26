import { SingleSelectDriver } from './SingleSelectDriver';

export class TenantSelectorDriver extends SingleSelectDriver {
  nodeName = 'descope-combo-box';

  get action() {
    return this.ele?.getAttribute('action');
  }
}
