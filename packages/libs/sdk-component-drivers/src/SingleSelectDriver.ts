import { BaseDriver } from './BaseDriver';

export class SingleSelectDriver extends BaseDriver {
  nodeName = 'descope-combo-box';

  onInput(cb: (e: InputEvent) => void) {
    this.ele?.addEventListener('input', cb);

    return () => this.ele?.removeEventListener('input', cb);
  }

  get value() {
    return (<HTMLInputElement>this.ele)?.value;
  }

  set value(value: string) {
    if (this.ele) {
      (<HTMLInputElement>this.ele).value = value;
    }
  }

  async setData(data: { label: string; value: string }[]) {
    (await this.asyncEle)?.setAttribute('data', JSON.stringify(data.sort()));
  }
}
