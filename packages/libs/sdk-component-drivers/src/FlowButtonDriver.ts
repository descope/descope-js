import { ButtonDriver } from './ButtonDriver';

export class FlowButtonDriver extends ButtonDriver {
  get flowId(): string {
    return this.ele?.getAttribute('flow-id') || '';
  }
}
