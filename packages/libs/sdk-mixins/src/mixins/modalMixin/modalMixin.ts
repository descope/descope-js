// eslint-disable-next-line max-classes-per-file
import { createSingletonMixin, compose } from '@descope/sdk-helpers';
import { initLifecycleMixin } from '../initLifecycleMixin';
import { initElementMixin } from '../initElementMixin';
import { descopeUiMixin } from '../descopeUiMixin';
import { createModalEle } from './helpers';
import { MODAL_ELE_TAG } from './constants';
import { ModalDriver } from '@descope/sdk-component-drivers';

export const modalMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) => {
    const BaseClass = compose(
      initLifecycleMixin,
      initElementMixin,
      descopeUiMixin,
    )(superclass);
    return class ModalMixinClass extends BaseClass {
      #ModalDriverWrapper = (() => {
        const loadDescopeUiComponents = this.loadDescopeUiComponents.bind(this);
        return class ModalDriverWrapper extends ModalDriver {
          setContent(template: HTMLTemplateElement) {
            loadDescopeUiComponents(template);
            // A modal builds its flow ahead of being opened, so hold the flow's
            // start call by default - otherwise every preloaded modal creates a
            // flow execution the user may never open. Released in open() below.
            // A caller that wants its flow to start on render opts out with
            // `lazyStart: false`, which is already on the template by now.
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
        };
      })();

      createModal(config?: Record<string, string>) {
        const baseConfig = {};

        const modal = createModalEle({
          ...baseConfig,
          ...config,
        });

        this.rootElement.append(modal);

        return new this.#ModalDriverWrapper(modal, {
          logger: this.logger,
        }) as ModalDriver;
      }

      async init() {
        this.loadDescopeUiComponents([MODAL_ELE_TAG]);
        await super.init?.();
      }
    };
  },
);
