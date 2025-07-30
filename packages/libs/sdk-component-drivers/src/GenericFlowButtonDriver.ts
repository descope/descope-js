import { FlowButtonDriver } from './FlowButtonDriver';

export class GenericFlowButtonDriver extends FlowButtonDriver {
  get enableMode(): 'onlyOne' | 'oneOrMore' | 'always' {
    return this.ele?.getAttribute('enable-mode') as
      | 'onlyOne'
      | 'oneOrMore'
      | 'always';
  }
}
