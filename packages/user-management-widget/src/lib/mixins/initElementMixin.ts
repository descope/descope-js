import { createSingletonMixin } from '../helpers/mixins';

const CONTENT_ROOT_ID = 'content-root';
const ROOT_ID = 'root';

export const initElementMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class InitElementMixinClass extends superclass {
      // the content of contentRootElement is being replaced dynamically
      // do not place content which is not dynamic inside
      contentRootElement: HTMLElement;

      rootElement: HTMLElement;

      constructor(...rest) {
        super(...rest);

        this.attachShadow({ mode: 'open' }).innerHTML = `

          <style>
            #${ROOT_ID}, #${CONTENT_ROOT_ID} {
              height: 100%;
            }
          </style>
          <div id="${ROOT_ID}">
            <div id="${CONTENT_ROOT_ID}"></div>
          </div>
          `;

        this.contentRootElement =
          this.shadowRoot?.getElementById(CONTENT_ROOT_ID)!;
        this.rootElement = this.shadowRoot?.getElementById(ROOT_ID)!;
      }
    },
);
