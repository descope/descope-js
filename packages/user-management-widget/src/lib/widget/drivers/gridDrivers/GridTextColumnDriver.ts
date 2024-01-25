import { BaseDriver } from '../BaseDriver';

export class GridTextColumnDriver extends BaseDriver {
  nodeName = 'descope-grid-text-column';

  onDirectionChange(
    cb: (e: CustomEvent<{ value: 'asc' | 'desc' | null }>) => void,
  ) {
    this.ele?.addEventListener('direction-changed', cb);

    return () => this.ele?.removeEventListener('selected-items-changed', cb);
  }
}
