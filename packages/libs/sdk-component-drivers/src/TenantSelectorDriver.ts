import { SingleSelectDriver } from './SingleSelectDriver';

export class TenantSelectorDriver extends SingleSelectDriver {
  nodeName = 'descope-combo-box';

  get onSuccessAction() {
    return this.ele?.getAttribute('action');
  }
}
