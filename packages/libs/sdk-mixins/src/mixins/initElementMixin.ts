import { createSingletonMixin } from '@descope/sdk-helpers';
import { injectStyleMixin } from './injectStyleMixin';
import { compose } from 'redux';

const CONTENT_ROOT_ID = 'content-root';
const ROOT_ID = 'root';

export const initElementMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) => {
    const BaseClass = compose(injectStyleMixin)(superclass);
    return class InitElementMixinClass extends BaseClass {
      // the content of contentRootElement is being replaced dynamically
      // do not place content which is not dynamic inside
      contentRootElement: HTMLElement;

      rootElement: HTMLElement;

      constructor(...rest) {
        super(...rest);

        this.attachShadow({ mode: 'open' }).innerHTML = `
          <div id="${ROOT_ID}">
            <div id="${CONTENT_ROOT_ID}"></div>
          </div>
          `;

        this.injectStyle(`
            #${ROOT_ID}, #${CONTENT_ROOT_ID} {
              height: 100%;
            }
            #${ROOT_ID} {
              position: relative;
              height: fit-content;
            }
          `);

        this.contentRootElement =
          this.shadowRoot?.getElementById(CONTENT_ROOT_ID)!;
        this.rootElement = this.shadowRoot?.getElementById(ROOT_ID)!;
      }
    };
  },
);
