import { BaseDriver } from './BaseDriver';

export class FlowDriver extends BaseDriver {
  nodeName = 'descope-wc';

  set projectId(projectId: string) {
    this.ele?.setAttribute('project-id', projectId);
  }

  set baseUrl(baseUrl: string) {
    this.ele?.setAttribute('base-url', baseUrl);
  }

  set flowId(flowId: string) {
    this.ele?.setAttribute('flow-id', flowId);
  }

  onSuccess(cb: () => void) {
    this.ele?.addEventListener('success', cb);

    return () => this.ele?.removeEventListener('success', cb);
  }
}
