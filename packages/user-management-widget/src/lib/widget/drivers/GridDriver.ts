import { BaseDriver } from './BaseDriver';

export class GridDriver<T extends any> extends BaseDriver {
  onSelectedItemsChange(cb: (e: CustomEvent<{ value: T[] }>) => void) {
    this.ele?.addEventListener('selected-items-changed', cb);

    return () => this.ele?.removeEventListener('selected-items-changed', cb);
  }

  get ele() {
    return super.ele as Element & { data: T[] };
  }

  get data() {
    return this.ele?.data;
  }

  set data(data: T[]) {
    if (this.ele)
      this.ele.data = data;
  }
}
