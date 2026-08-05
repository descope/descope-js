import { BaseDriver } from './BaseDriver';

export type FilterInputType =
  | 'text'
  | 'number'
  | 'email'
  | 'boolean'
  | 'singleselect'
  | 'multiselect';

export type FilterOption = { value: string; label: string };

export type FilterColumn = {
  id: string;
  label: string;
  inputType: FilterInputType;
  options?: FilterOption[];
  // A built-in operator id, or an object overriding widget defaults — notably
  // `prefix`/`suffix` (query affixes the consumer applies, e.g. SQL-LIKE `%`).
  operators?: (
    | string
    | {
        id: string;
        label?: string;
        noValue?: boolean;
        prefix?: string;
        suffix?: string;
      }
  )[];
};

export type FilterRow = {
  column: string;
  operator: string;
  value: string | string[] | null;
  // Emitted on applied rows when the operator defines query affixes. The value
  // stays raw; the consumer builds the query as `${prefix}${value}${suffix}`.
  prefix?: string;
  suffix?: string;
};

export type FilterEventDetail = {
  value: FilterRow[];
  action: 'apply' | 'clear-all' | 'cancel';
};

export class FilterDriver extends BaseDriver {
  nodeName = 'descope-filter';

  // Serialized value of the last `data` we wrote, so onDataChange can tell our
  // own writes apart from external ones.
  #lastData: string | null = null;

  get data(): FilterColumn[] {
    try {
      return JSON.parse(this.ele?.getAttribute('data') || '[]');
    } catch {
      return [];
    }
  }

  set data(value: FilterColumn[]) {
    this.#lastData = JSON.stringify(value);
    this.ele?.setAttribute('data', this.#lastData);
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

  // Fires when the `data` attribute is changed by something other than this
  // driver (e.g. the screen editor republishing a different pick list). The
  // driver's own writes are skipped by comparing against #lastData.
  onDataChange(cb: () => void) {
    const ele = this.ele;
    if (!ele) return () => {};
    const observer = new MutationObserver(() => {
      if ((ele.getAttribute('data') ?? '[]') === this.#lastData) return;
      cb();
    });
    observer.observe(ele, { attributes: true, attributeFilter: ['data'] });
    return () => observer.disconnect();
  }
}
