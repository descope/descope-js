import { ButtonDriver } from './ButtonDriver';

export class GenericFlowButtonDriver extends ButtonDriver {
  get flowId(): string {
    return this.ele?.getAttribute('flow-id') || '';
  }
  get enableMode(): 'onlyOne' | 'oneOrMore' | 'always' {
    return this.ele?.getAttribute('enable-mode') as
      | 'onlyOne'
      | 'oneOrMore'
      | 'always';
  }
}
