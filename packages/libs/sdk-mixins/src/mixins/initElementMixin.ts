import { createSingletonMixin } from '@descope/sdk-helpers';

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
          <div id="${ROOT_ID}">
            <div id="${CONTENT_ROOT_ID}"></div>
          </div>
          `;

        const sheet = new CSSStyleSheet();
        sheet.replaceSync(`
            #${ROOT_ID}, #${CONTENT_ROOT_ID} {
              height: 100%;
            }
            #${ROOT_ID} {
              position: relative;
              height: fit-content;
            }
          `);

        this.shadowRoot.adoptedStyleSheets ??= [];
        this.shadowRoot.adoptedStyleSheets = [
          ...this.shadowRoot.adoptedStyleSheets,
          sheet,
        ];

        this.contentRootElement =
          this.shadowRoot?.getElementById(CONTENT_ROOT_ID)!;
        this.rootElement = this.shadowRoot?.getElementById(ROOT_ID)!;
      }
    },
);
