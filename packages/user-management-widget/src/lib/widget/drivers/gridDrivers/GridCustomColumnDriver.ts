import { BaseDriver } from '../BaseDriver';

export class GridCustomColumnDriver extends BaseDriver {
  nodeName = 'descope-grid-custom-column';

  onSortDirectionChange(
    cb: (e: CustomEvent<{ value: 'asc' | 'desc' | null }>) => void,
  ) {
    this.ele?.addEventListener('direction-changed', cb);

    return () => this.ele?.removeEventListener('selected-items-changed', cb);
  }
}
