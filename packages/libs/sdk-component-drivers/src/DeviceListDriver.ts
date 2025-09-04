import { BaseDriver } from './BaseDriver';

type Data = {
  id: string;
  name: string;
  lastLoginDate: number;
  isCurrent: boolean;
}[];

export class DeviceListDriver extends BaseDriver {
  nodeName = 'descope-trusted-devices';

  set displayName(name: string) {
    this.ele?.setAttribute('display-name', name);
  }

  get ele() {
    return super.ele as Element & {
      data: Data;
    };
  }

  get data() {
    return this.ele?.data;
  }

  set data(data: Data) {
    if (this.ele) this.ele.data = data;
  }

  get flowId() {
    return this.ele?.getAttribute('flow-id');
  }

  onClick(cb: (e: Event) => void) {
    this.ele?.addEventListener('remove-device-clicked', cb);

    return () => this.ele?.removeEventListener('remove-device-clicked', cb);
  }
}
