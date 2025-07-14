import { BaseDriver } from './BaseDriver';

type Data = { name: string; icon: string }[];

export class OutboundAppsListDriver extends BaseDriver {
  nodeName = 'descope-outbound-apps';

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

  get connectFlowId() {
    return this.ele?.getAttribute('connect-flow-id') || '';
  }

  onConnectClick(cb: (e: Event) => void) {
    this.ele?.addEventListener('connect-clicked', cb);

    return () => this.ele?.removeEventListener('connect-clicked', cb);
  }
}
