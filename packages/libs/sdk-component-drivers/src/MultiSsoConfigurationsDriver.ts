import { BaseDriver } from './BaseDriver';

type Data = {
  id: string;
  name: string;
  authType?: string;
  isDefault?: boolean;
  link?: string;
}[];

type DeleteDetail = { id: string; name: string };

export class MultiSsoConfigurationsDriver extends BaseDriver {
  nodeName = 'descope-multi-sso';

  set data(data: Data) {
    if (this.ele) this.ele.data = data;
  }

  get data() {
    return this.ele?.data;
  }

  get ele() {
    return super.ele as Element & {
      data: Data;
    };
  }

  get createFlowId() {
    return this.ele?.getAttribute('data-create-flow-id') || '';
  }

  get deleteFlowId() {
    return this.ele?.getAttribute('data-delete-flow-id') || '';
  }

  onCreateClicked(cb: () => void) {
    const handler = () => cb();
    this.ele?.addEventListener('create-clicked', handler);

    return () => this.ele?.removeEventListener('create-clicked', handler);
  }

  onDeleteClicked(cb: (detail: DeleteDetail) => void) {
    const handler = (e: CustomEvent<DeleteDetail>) => cb(e.detail);
    this.ele?.addEventListener('delete-clicked', handler);

    return () => this.ele?.removeEventListener('delete-clicked', handler);
  }
}
