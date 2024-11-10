import { UserAttributeDriver } from '@descope/sdk-component-drivers';
import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import { loggerMixin } from '@descope/sdk-mixins';
import { getUserCustomAttrs } from '../../../state/selectors';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';

export const initUserCustomAttributesMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class UserCustomAttributesMixinClass extends compose(
      stateManagementMixin,
      loggerMixin,
      initWidgetRootMixin,
    )(superclass) {
      customValueUserAttr: UserAttributeDriver;

      #initCustomValueUserAttrs() {
        const allCustomAttributesComponents = this.shadowRoot?.querySelectorAll(
          'descope-user-attribute[data-id^="customAttributes."]',
        );

        Array.from(allCustomAttributesComponents).forEach((nodeEle) => {
          const attrName = nodeEle.getAttribute('data-id');
          const customAttrName = attrName.replace('customAttributes.', '');

          const compInstance = new UserAttributeDriver(nodeEle, {
            logger: this.logger,
          });

          const userCustomAttributesData = getUserCustomAttrs(this.state);
          compInstance.value = userCustomAttributesData[customAttrName];
        });
      }

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        this.#initCustomValueUserAttrs();
      }
    },
);
