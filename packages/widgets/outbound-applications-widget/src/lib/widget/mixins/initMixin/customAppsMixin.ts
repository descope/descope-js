import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import { debuggerMixin } from '@descope/sdk-mixins';
import { initWidgetRootMixin } from './initComponentsMixins/initWidgetRootMixin';
import { stateManagementMixin } from '../stateManagementMixin';

export const customAppsMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    // @ts-ignore
    class CustomAppsMixinClass extends compose(
      debuggerMixin,
      stateManagementMixin,
      initWidgetRootMixin,
    )(superclass) {},
);
