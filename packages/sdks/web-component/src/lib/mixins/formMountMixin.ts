/* eslint-disable import/prefer-default-export */
import { createSingletonMixin } from '@descope/sdk-helpers';
import { isChromium } from '../helpers';

export const formMountMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class FormMountMixin extends superclass {
      #shouldMountInFormEle() {
        const wc = this.shadowRoot.host;
        return !wc.closest('form') && isChromium();
      }

      // we want to make sure the web-component is wrapped with on outer form element
      // this is needed in order to support webauthn conditional UI (which currently supported only in Chrome when input is inside a web-component)
      // for more info see here: https://github.com/descope/etc/issues/733
      #handleOuterForm() {
        const wc = this.shadowRoot.host;
        const form = document.createElement('form');
        form.style.width = '100%';
        form.style.height = '100%';
        wc.parentElement.appendChild(form);
        form.appendChild(wc);
      }

      connectedCallback() {
        if (this.#shouldMountInFormEle()) {
          this.#handleOuterForm();
        }
        super['connectedCallback']?.();
      }
    },
);
