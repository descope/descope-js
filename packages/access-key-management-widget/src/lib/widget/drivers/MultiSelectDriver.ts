import { BaseDriver } from './BaseDriver';

export class MultiSelectDriver extends BaseDriver {
  nodeName = 'descope-multi-select-combo-box';

  async setData(data: { label: string; value: string }[]) {
    (await this.asyncEle)?.setAttribute('data', JSON.stringify(data.sort()));
  }
}
