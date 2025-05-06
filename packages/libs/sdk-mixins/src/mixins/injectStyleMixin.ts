import { createSingletonMixin } from '@descope/sdk-helpers';
import { cspNonceMixin } from './cspNonceMixin';
import { compose } from 'redux';

// we should mimic the CSSStyleSheet API for the fns we are using
class CSSStyleSheetMock {
  styleEle: HTMLStyleElement;
  ref: ShadowRoot | HTMLElement | null;
  constructor(ref: ShadowRoot, nonce: string, { prepend = false } = {}) {
    this.styleEle = document.createElement('style');
    this.styleEle.setAttribute('nonce', nonce);
    this.ref = ref;

    if (!this.ref) {
      return;
    }

    if (prepend) {
      this.ref.prepend(this.styleEle);
    } else {
      this.ref.append(this.styleEle);
    }
  }

  replaceSync(cssString: string) {
    this.styleEle.textContent = cssString;
  }

  get cssRules() {
    return this.styleEle.sheet?.cssRules;
  }
}

export const injectStyleMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) => {
    const BaseClass = compose(cspNonceMixin)(superclass);
    return class InjectStyleMixinClass extends BaseClass {
      injectStyle(cssString: string, { prepend = false } = {}) {
        let style: CSSStyleSheet | CSSStyleSheetMock;
        try {
          style = new CSSStyleSheet();
        } catch (e) {
          // fallback for browsers that don't support CSSStyleSheet
          style = new CSSStyleSheetMock(this.shadowRoot, this.nonce, {
            prepend,
          });
        }

        if (cssString) {
          style.replaceSync(cssString);
        }

        if (style instanceof CSSStyleSheet) {
          const ref = this.shadowRoot;

          if (ref && 'adoptedStyleSheets' in ref) {
            const adoptedStyleSheets = [...(ref.adoptedStyleSheets || [])];
            adoptedStyleSheets[prepend ? 'unshift' : 'push'](style);

            ref.adoptedStyleSheets = adoptedStyleSheets;
          }
        }

        return style;
      }
    };
  },
);
