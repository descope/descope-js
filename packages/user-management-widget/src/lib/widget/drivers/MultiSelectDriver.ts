import { BaseDriver } from './BaseDriver';

export class MultiSelectDriver extends BaseDriver {
  nodeName = 'descope-multi-select-combo-box';

  setData(data: { label: string; value: string }[]) {
    const sortedRoles = data;
    this.ele?.setAttribute('data', JSON.stringify(sortedRoles.sort()));
  }

  setDefaultValues(vals: Record<string, string>) {
    this.ele?.setAttribute('default-values', JSON.stringify(vals));
  }
}
