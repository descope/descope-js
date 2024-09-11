import { BaseDriver } from './BaseDriver';

type Data = { name: string, icon: string, url: string }[];

export class AppsListDriver extends BaseDriver {
  nodeName = 'descope-apps-list';

  set data(data: Data) {
    if(this.ele) this.ele.data = data;
  }

  get data() {
    return this.ele?.data
  }

  get ele() {
    return super.ele as Element & {
      data: Data;
    };
  }
}
