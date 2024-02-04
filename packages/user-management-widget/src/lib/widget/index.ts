import { compose } from '../helpers/compose';
import { initMixin } from './mixins/initMixin/initMixin';

const rootMixin = (superclass: CustomElementConstructor) =>
  class RootMixinClass extends compose(initMixin)(superclass) {};

export const UserManagementWidget = compose(rootMixin)(HTMLElement);
