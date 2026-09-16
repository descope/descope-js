import { createSingletonMixin } from '@descope/sdk-helpers';
import { ModalDriver } from '@descope/sdk-component-drivers';
import { modalMixin } from '../modalMixin';

/**
 * A modal that hosts a flow.
 *
 * Widgets build a modal's flow ahead of the modal being opened, so the flow's
 * start call is held until it opens - otherwise a preloaded modal the user
 * never opens still creates a flow execution. A caller whose flow must start as
 * soon as it renders opts out with `lazyStart: false` on the flow template.
 */
export const flowModalMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class FlowModalMixinClass extends modalMixin(superclass) {
      createFlowModal(config?: Record<string, string>) {
        const ModalDriverClass = this.modalDriverClass;

        class FlowModalDriver extends ModalDriverClass {
          setContent(template: HTMLTemplateElement) {
            const flowEle = template.content.querySelector('descope-wc');
            if (flowEle && !flowEle.hasAttribute('lazy-start')) {
              flowEle.setAttribute('lazy-start', 'true');
            }
            super.setContent(template);
          }

          async open() {
            await super.open();
            (this.ele?.querySelector('descope-wc') as any)?.start?.();
          }
        }

        return this.createModal(config, FlowModalDriver as typeof ModalDriver);
      }
    },
);
