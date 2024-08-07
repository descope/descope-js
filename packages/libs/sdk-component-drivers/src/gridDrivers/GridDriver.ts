import { compareArrays } from '@descope/sdk-helpers';
import { BaseDriver } from '../BaseDriver';
import { GridCustomColumnDriver } from './GridCustomColumnDriver';
import { GridTextColumnDriver } from './GridTextColumnDriver';

type Column = {
  path: string;
  header: string;
  type: string;
  attrs: Record<string, string>;
};

const columnRegex = /^descope-grid-([^-]+)-column$/;

const driversMapping = {
  text: GridTextColumnDriver,
  custom: GridCustomColumnDriver,
};

export class GridDriver<T extends any> extends BaseDriver {
  nodeName = 'descope-grid';
  #onColumnsChangeCb: (columns: Column[]) => void;

  onSelectedItemsChange(cb: (e: CustomEvent<{ value: T[] }>) => void) {
    this.ele?.addEventListener('selected-items-changed', cb);

    return () => this.ele?.removeEventListener('selected-items-changed', cb);
  }

  get ele() {
    return super.ele as Element & {
      data: T[];
      columns: Column[];
      renderColumn: ({ path, header, type, attrs }: Column) => string;
    };
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

  filterColumns(filterFn: (col: Column) => boolean) {
    const filteredColumns = this.ele.columns?.filter(filterFn);
    if (!compareArrays(filteredColumns, this.ele.columns)) {
      this.ele.columns = filteredColumns;
      this.#onColumnsChangeCb?.(filteredColumns);
    }
  }

  onColumnsChange(cb: (columns: Column[]) => void) {
    this.#onColumnsChangeCb = cb;
  }

  set renderColumn(
    renderFn: ({ path, header, type, attrs }: Column) => string,
  ) {
    this.ele.renderColumn = renderFn;
  }
}
