import { compose } from '@descope/sdk-helpers';
import { initMixin } from './mixins/initMixin/initMixin';

const rootMixin = (superclass: CustomElementConstructor) =>
  class RootMixinClass extends initMixin(superclass) {};

export const AccessKeyManagementWidget = compose(rootMixin)(HTMLElement);
