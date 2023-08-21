import {
  ELEMENT_TYPE_ATTRIBUTE,
  DESCOPE_ATTRIBUTE_EXCLUDE_FIELD,
} from '../constants';
import { ScreenState } from '../types';

const replaceElementMessage = (
  baseEle: DocumentFragment,
  eleType: string,
  message = ''
) => {
  const eleList = baseEle.querySelectorAll(
    `[${ELEMENT_TYPE_ATTRIBUTE}="${eleType}"]`
  );
  eleList.forEach((ele: HTMLElement) => {
    // eslint-disable-next-line no-param-reassign
    ele.textContent = message;
    ele.classList[message ? 'remove' : 'add']('hide');
  });
};

/**
 * Replace the 'value' attribute of screen inputs with screen state's inputs.
 * For example: if base element contains '<input name="key1" ...>' and screen input is in form of { key1: 'val1' },
 * it will add 'val1' as the input value
 */
const replaceElementInputs = (
  baseEle: DocumentFragment,
  screenInputs: Record<string, string>
) => {
  Object.entries(screenInputs || {}).forEach(([name, value]) => {
    const inputEls = Array.from(
      baseEle.querySelectorAll(
        `*[name="${name}"]:not([${DESCOPE_ATTRIBUTE_EXCLUDE_FIELD}])`
      )
    ) as HTMLInputElement[];
    inputEls.forEach((inputEle) => {
      inputEle.setAttribute('value', value);
    });
  });
};

/**
 * Get object nested path.
 * Examples:
 *  - getByPath({ { a { b: 'rob' } }, 'a.b') => 'hey rob'
 *  - getByPath({}, 'a.b') => ''
 */
const getByPath = (obj: Record<string, any>, path: string) =>
  path.split('.').reduce((prev, next) => prev?.[next] || '', obj);

/**
 * Apply template language on text, based on screen state.
 * Examples:
 *  - 'hey {{a.b}}', { a { b: 'rob' }} => 'hey rob'
 *  - 'hey {{not.exists}}', {} => 'hey '
 */
const applyTemplates = (
  text: string,
  screenState?: Record<string, any>
): string =>
  text.replace(/{{(.+?)}}/g, (_, match) => getByPath(screenState, match));

/**
 * Replace the templates of content of inner text/link elements with screen state data
 */
const replaceElementTemplates = (
  baseEle: DocumentFragment,
  screenState?: Record<string, any>
) => {
  const eleList = baseEle.querySelectorAll('descope-text,descope-link');
  eleList.forEach((inEle: HTMLElement) => {
    // eslint-disable-next-line no-param-reassign
    inEle.textContent = applyTemplates(inEle.textContent, screenState);
  });
};

const replaceProvisionURL = (
  baseEle: DocumentFragment,
  provisionUrl?: string
) => {
  const eleList = baseEle.querySelectorAll(
    `[${ELEMENT_TYPE_ATTRIBUTE}="totp-link"]`
  );
  eleList.forEach((ele: HTMLLinkElement) => {
    // eslint-disable-next-line no-param-reassign
    ele.href = provisionUrl;
  });
};

/**
 * Perform action in base element based on screen state
 *  - Show/hide error messages
 *  - Replace values of element inputs with screen state's inputs
 *  - Replace element templates ({{...}} syntax) with screen state object
 */
export const replaceWithScreenState = (
  baseEle: DocumentFragment,
  screenState?: ScreenState
) => {
  replaceElementMessage(baseEle, 'error-message', screenState?.errorText);
  replaceElementInputs(baseEle, screenState?.inputs);
  replaceProvisionURL(baseEle, screenState?.totp?.provisionUrl);
  replaceElementTemplates(baseEle, screenState);
};

export const setTOTPVariable = (rootEle: HTMLElement, image?: string) => {
  const totpVarName = (
    customElements.get('descope-totp-image') as CustomElementConstructor & {
      cssVarList: Record<string, string>;
    }
  )?.cssVarList.url;

  if (image && totpVarName) {
    rootEle?.style?.setProperty(
      totpVarName,
      `url(data:image/jpg;base64,${image})`
    );
  }
};

export const setPhoneAutoDetectDefaultCode = (
  fragment: DocumentFragment,
  autoDetectCode?: string
) => {
  Array.from(
    fragment.querySelectorAll('descope-phone-field[default-code="autoDetect"]')
  ).forEach((phoneEle) => {
    phoneEle.setAttribute('default-code', autoDetectCode);
  });
};

export const disableWebauthnButtons = (fragment: DocumentFragment) => {
  const webauthnButtons = fragment.querySelectorAll(
    `descope-button[${ELEMENT_TYPE_ATTRIBUTE}="biometrics"]`
  );
  webauthnButtons.forEach((button) => button.setAttribute('disabled', 'true'));
};

export const getDescopeUiComponentsList = (clone: DocumentFragment) => [
  ...Array.from(clone.querySelectorAll('*')).reduce<Set<string>>(
    (acc, el: HTMLElement) =>
      el.tagName.startsWith('DESCOPE-')
        ? acc.add(el.tagName.toLocaleLowerCase())
        : acc,
    new Set()
  ),
];
