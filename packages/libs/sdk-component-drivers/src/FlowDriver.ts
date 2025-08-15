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

  set theme(theme: string | null | undefined) {
    if (!theme) {
      this.ele?.removeAttribute('theme');
    } else {
      this.ele?.setAttribute('theme', theme);
    }
  }

  onSuccess(cb: () => void) {
    this.ele?.addEventListener('success', cb);

    return () => this.ele?.removeEventListener('success', cb);
  }
  onPageUpdated(cb: () => void) {
    this.ele?.addEventListener('page-updated', cb);

    return () => this.ele?.removeEventListener('page-updated', cb);
  }
}
