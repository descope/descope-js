import { BaseDriver } from './BaseDriver';

export type FilterInputType =
  | 'text'
  | 'number'
  | 'email'
  | 'boolean'
  | 'singleselect'
  | 'multiselect';

export type FilterValueType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'enum'
  | 'multi-enum';

export type FilterOption = { value: string; label: string };

export type FilterColumn = {
  id: string;
  label: string;
  inputType: FilterInputType;
  valueType?: FilterValueType;
  options?: FilterOption[];
  operators?: string[];
};

export type FilterRow = {
  column: string;
  operator: string;
  value: string | string[] | null;
};

export type FilterEventDetail = {
  value: FilterRow[];
  action: 'apply' | 'clear-all' | 'cancel';
};

export class FilterDriver extends BaseDriver {
  nodeName = 'descope-filter';

  get data(): FilterColumn[] {
    try {
      return JSON.parse(this.ele?.getAttribute('data') || '[]');
    } catch {
      return [];
    }
  }

  set data(value: FilterColumn[]) {
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
}
