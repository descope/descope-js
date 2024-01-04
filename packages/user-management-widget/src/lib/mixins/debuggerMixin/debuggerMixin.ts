import { compose } from '../../helpers/compose';
import { createSingletonMixin } from '../../helpers/mixins';
import { initLifecycleMixin } from '../initLifecycleMixin';
import { INTERNAL_LOG_EVENTS } from '../loggerMixin';
import { DebuggerMessage } from './types';

export const debuggerMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class DebuggerMixinClass extends compose(initLifecycleMixin)(superclass) {

      #debuggerEle: (HTMLElement & {
        updateData: (data: DebuggerMessage | DebuggerMessage[]) => void;
      }) | null;

      #disableDebugger() {
        this.#debuggerEle?.remove();
        this.#debuggerEle = null;
      }

      async #enableDebugger() {
        this.#debuggerEle = document.createElement(
          'descope-debugger',
        ) as HTMLElement & {
          updateData: (data: DebuggerMessage | DebuggerMessage[]) => void;
        };

        Object.assign(this.#debuggerEle.style, {
          position: 'fixed',
          top: '0',
          right: '0',
          height: '100vh',
          width: '100vw',
          pointerEvents: 'none',
          zIndex: 99999,
        });

        // we are importing the debugger dynamically so we won't load it when it's not needed
        await import('./debugger-wc');

        document.body.appendChild(this.#debuggerEle);
      }

      attributeChangedCallback = (
        attrName: string,
        oldValue: string | null,
        newValue: string | null,
      ) => {

        super.attributeChangedCallback?.(attrName, oldValue, newValue);

        if (attrName === 'debug') {
          this.#handleDebugMode();
        }
      };

      get debug() {
        return this.getAttribute('debug') === 'true';
      }

      #handleDebugMode() {
        if (this.debug) this.#enableDebugger();
        else this.#disableDebugger();
      }

      async init() {
        await super.init?.();

        this.#handleDebugMode();

        //TODO: think about events mixin?
        this.addEventListener(INTERNAL_LOG_EVENTS.error, (e) => {
          const { detail } = e as CustomEvent<[string, string]>;
          this.#updateDebuggerMessages(...detail);
        });
      }

      #updateDebuggerMessages(title: string, description: string) {
        if (title)
          this.#debuggerEle?.updateData({ title, description });
      }
    },
);




