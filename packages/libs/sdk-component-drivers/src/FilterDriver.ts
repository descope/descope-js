import { BaseDriver } from './BaseDriver';

type FilterRow = {
  column: string;
  operator: string;
  value: string | string[] | null;
};

type FilterEventDetail = {
  value: FilterRow[];
  action: 'apply' | 'clear-all' | 'cancel';
};

export class FilterDriver extends BaseDriver {
  nodeName = 'descope-filter';

  get data(): any[] {
    try {
      return JSON.parse(this.ele?.getAttribute('data') || '[]');
    } catch {
      return [];
    }
  }

  set data(value: any[]) {
    this.ele?.setAttribute('data', JSON.stringify(value));
  }

  get value(): FilterRow[] {
    try {
      return JSON.parse(this.ele?.getAttribute('value') || '[]');
    } catch {
      return [];
    }
  }

  set value(value: FilterRow[]) {
    this.ele?.setAttribute('value', JSON.stringify(value));
  }

  onApply(cb: (detail: FilterEventDetail) => void) {
    const handler = (e: Event) => cb((e as CustomEvent).detail);
    this.ele?.addEventListener('filter-apply', handler);
    return () => this.ele?.removeEventListener('filter-apply', handler);
  }

  onClear(cb: (detail: FilterEventDetail) => void) {
    const handler = (e: Event) => cb((e as CustomEvent).detail);
    this.ele?.addEventListener('filter-clear', handler);
    return () => this.ele?.removeEventListener('filter-clear', handler);
  }

  onCancel(cb: (detail: FilterEventDetail) => void) {
    const handler = (e: Event) => cb((e as CustomEvent).detail);
    this.ele?.addEventListener('filter-cancel', handler);
    return () => this.ele?.removeEventListener('filter-cancel', handler);
  }

  // Update the options for a specific column by id. Used to inject runtime
  // values (e.g. Roles populated from tenant state) without rebuilding the
  // full column array on the consumer side.
  setColumnOptions(
    columnId: string,
    options: { value: string; label: string }[],
  ) {
    const cols = this.data;
    const col = cols.find((c: any) => c.id === columnId);
    if (!col) return;
    col.options = options;
    this.data = cols;
  }
}
