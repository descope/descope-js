import { BaseDriver } from './BaseDriver';

export class SingleSelectDriver extends BaseDriver {
  nodeName = 'descope-combo-box';

  async setData(data: { label: string; value: string }[]) {
    (await this.asyncEle)?.setAttribute('data', JSON.stringify(data.sort()));
  }
}
