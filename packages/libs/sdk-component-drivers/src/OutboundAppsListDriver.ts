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
}
