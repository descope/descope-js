import { BaseDriver } from '../BaseDriver';
import { GridTextColumnDriver } from './GridTextColumnDriver';

const columnRegex = /^descope-grid-([^-]+)-column$/;

const driversMapping = {
  text: GridTextColumnDriver,
};

export class GridDriver<T extends any> extends BaseDriver {
  nodeName = 'descope-grid';

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
    if (this.ele) this.ele.data = data;
  }

  get columns() {
    if (!this.ele) return [];
    return Array.from(this.ele.children).reduce((acc, child) => {
      const columnType = columnRegex.exec(child.localName)?.[1];
      const Driver = driversMapping[columnType];

      if (!Driver) return acc;

      acc.push(new Driver(child, { logger: this.logger }));

      return acc;
    }, []);
  }
}
