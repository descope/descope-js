import { BaseDriver } from './BaseDriver';

export class UserAttributeDriver extends BaseDriver {
  nodeName = 'descope-user-attribute';

  set value(value: string) {
    this.ele?.setAttribute('value', value);
  }

  set badgeLabel(label: string) {
    this.ele?.setAttribute('badge-label', label);
  }

  get label() {
    return this.ele?.getAttribute('label') || '';
  }

  get editFlowId() {
    return this.ele?.getAttribute('edit-flow-id') || '';
  }

  get deleteFlowId() {
    return this.ele?.getAttribute('delete-flow-id') || '';
  }

  onEditClick(cb: (e: Event) => void) {
    this.ele?.addEventListener('edit-clicked', cb);

    return () => this.ele?.removeEventListener('edit-clicked', cb);
  }

  onDeleteClick(cb: (e: Event) => void) {
    this.ele?.addEventListener('delete-clicked', cb);

    return () => this.ele?.removeEventListener('delete-clicked', cb);
  }
}
