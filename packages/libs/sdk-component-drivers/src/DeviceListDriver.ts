import { BaseDriver } from './BaseDriver';

type Data = {
  id: string;
  name: string;
  lastLoginDate: number;
  isCurrent: boolean;
}[];

type Detail = { id: string; action: string };

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

  onRemoveDeviceClick(cb: (detail: Detail) => void) {
    const handler = (e: CustomEvent<Detail>) => cb(e.detail);
    this.ele?.addEventListener('remove-device-clicked', handler);

    return () =>
      this.ele?.removeEventListener('remove-device-clicked', handler);
  }
}
