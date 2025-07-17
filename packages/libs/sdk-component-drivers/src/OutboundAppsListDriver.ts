import { BaseDriver } from './BaseDriver';

type Data = { name: string; logo: string }[];

type Detail = { id: string; action: string };

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

  get disconnectFlowId() {
    return this.ele?.getAttribute('disconnect-flow-id') || '';
  }

  onConnectClick(cb: (detail: Detail) => void) {
    const handler = (e: CustomEvent<Detail>) => cb(e.detail);
    this.ele?.addEventListener('connect-clicked', handler);

    return () => this.ele?.removeEventListener('connect-clicked', handler);
  }

  onDisconnectClick(cb: (detail: Detail) => void) {
    const handler = (e: CustomEvent<Detail>) => cb(e.detail);
    this.ele?.addEventListener('disconnect-clicked', handler);

    return () => this.ele?.removeEventListener('disconnect-clicked', handler);
  }
}
