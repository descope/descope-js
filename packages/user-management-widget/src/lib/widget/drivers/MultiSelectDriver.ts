import { BaseDriver } from './BaseDriver';

export class MultiSelectDriver extends BaseDriver {
  nodeName = 'descope-combo-box';
  // nodeName = 'descope-button-multi-selection-group';

  setData(data: { label: string; value: string }[]) {
    this.ele?.setAttribute('data', JSON.stringify(data));
  }

  setDefaultValues(vals: Record<string, string>) {
    this.ele?.setAttribute('default-values', JSON.stringify(vals));
  }
}
