import {
  ELEMENT_TYPE_ATTRIBUTE,
  DESCOPE_ATTRIBUTE_EXCLUDE_FIELD,
  HAS_DYNAMIC_VALUES_ATTR_NAME,
} from '../constants';
import { ComponentsConfig, ScreenState } from '../types';

const replaceElementMessage = (
  baseEle: DocumentFragment,
  eleType: string,
  message = '',
) => {
  const eleList = baseEle.querySelectorAll(
    `[${ELEMENT_TYPE_ATTRIBUTE}="${eleType}"]`,
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
  baseEle: HTMLElement,
  screenInputs: Record<string, string>,
) => {
  Object.entries(screenInputs || {}).forEach(([name, value]) => {
    const inputEls = Array.from(
      baseEle.querySelectorAll(
        `*[name="${name}"]:not([${DESCOPE_ATTRIBUTE_EXCLUDE_FIELD}])`,
      ),
    ) as HTMLInputElement[];
    inputEls.forEach((inputEle) => {
      // eslint-disable-next-line no-param-reassign
      inputEle.value = value;
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
  screenState?: Record<string, any>,
): string =>
  text.replace(/{{(.+?)}}/g, (_, match) => getByPath(screenState, match));

/**
 * Replace the templates of content of inner text/link elements with screen state data
 */
const replaceElementTemplates = (
  baseEle: DocumentFragment,
  screenState?: Record<string, any>,
) => {
  const eleList = baseEle.querySelectorAll('descope-text,descope-link');
  eleList.forEach((inEle: HTMLElement) => {
    // eslint-disable-next-line no-param-reassign
    inEle.textContent = applyTemplates(inEle.textContent, screenState);
  });
};

const replaceTemplateDynamicAttrValues = (
  baseEle: DocumentFragment,
  screenState?: Record<string, any>,
) => {
  const eleList = baseEle.querySelectorAll(`[${HAS_DYNAMIC_VALUES_ATTR_NAME}]`);
  eleList.forEach((ele: HTMLElement) => {
    Array.from(ele.attributes).forEach((attr) => {
      // eslint-disable-next-line no-param-reassign
      attr.value = applyTemplates(attr.value, screenState);
    });
  });
};

const replaceHrefByDataType = (
  baseEle: DocumentFragment,
  dataType: string,
  provisionUrl?: string,
) => {
  const eleList = baseEle.querySelectorAll(
    `[${ELEMENT_TYPE_ATTRIBUTE}="${dataType}"]`,
  );
  eleList.forEach((ele: HTMLLinkElement) => {
    // eslint-disable-next-line no-param-reassign
    ele.setAttribute('href', provisionUrl);
  });
};

const enableDisableInputs = (
  baseEle: DocumentFragment,
  formData: Record<string, string>,
) => {
  Object.keys(formData).forEach((name) => {
    const eles = baseEle.querySelectorAll(`[name="${name}"]`);
    eles.forEach((ele) => {
      Object.keys(formData[name]).forEach((attr) => {
        ele.setAttribute(attr, formData[name][attr]);
      });
    });
  });
};

const setElementConfig = (
  baseEle: DocumentFragment,
  componentsConfig: ComponentsConfig,
  logger?: { error: (message: string, description: string) => void },
) => {
  if (!componentsConfig) {
    return;
  }
  // collect components that needs configuration from DOM
  Object.keys(componentsConfig).forEach((componentName) => {
    baseEle.querySelectorAll(`[name=${componentName}]`).forEach((comp) => {
      const config = componentsConfig[componentName];

      Object.keys(config).forEach((attr) => {
        let value = config[attr];

        if (typeof value !== 'string') {
          try {
            value = JSON.stringify(value);
          } catch (e) {
            logger.error(
              `Could not stringify value "${value}" for "${attr}"`,
              e.message,
            );
            value = '';
          }
        }

        comp.setAttribute(attr, value);
      });
    });
  });
};

const setImageVariable = (
  rootEle: HTMLElement,
  name: string,
  image?: string,
) => {
  const imageVarName = (
    customElements.get(name) as CustomElementConstructor & {
      cssVarList: Record<string, string>;
    }
  )?.cssVarList.url;

  if (image && imageVarName) {
    rootEle?.style?.setProperty(
      imageVarName,
      `url(data:image/jpg;base64,${image})`,
    );
  }
};

/**
 * Update a screen template based on the screen state
 *  - Show/hide error messages
 *  - Replace element templates ({{...}} syntax) with screen state object
 */
export const updateTemplateFromScreenState = (
  baseEle: DocumentFragment,
  screenState?: ScreenState,
  componentsConfig?: ComponentsConfig,
  flowInputs?: Record<string, string>,
  errorTransformer?: (error: { text: string; type: string }) => string,
  logger?: { error: (message: string, description: string) => void },
) => {
  let errorText = screenState?.errorText;
  try {
    errorText =
      errorTransformer?.({
        text: screenState?.errorText,
        type: screenState?.errorType,
      }) || screenState?.errorText;
  } catch (e) {
    logger.error('Error transforming error message', e.message);
  }
  replaceElementMessage(baseEle, 'error-message', errorText);
  replaceHrefByDataType(baseEle, 'totp-link', screenState?.totp?.provisionUrl);
  replaceHrefByDataType(baseEle, 'notp-link', screenState?.notp?.redirectUrl);
  replaceElementTemplates(baseEle, screenState);
  setElementConfig(baseEle, componentsConfig, logger);
  replaceTemplateDynamicAttrValues(baseEle, screenState);
  enableDisableInputs(baseEle, flowInputs);
};

/**
 * Update a screen based on a screen state
 *  - Replace values of element inputs with screen state's inputs
 */
export const updateScreenFromScreenState = (
  baseEle: HTMLElement,
  screenState?: ScreenState,
) => {
  replaceElementInputs(baseEle, screenState?.inputs);
  replaceElementInputs(baseEle, screenState?.form);
};

export const setTOTPVariable = (rootEle: HTMLElement, image?: string) => {
  setImageVariable(rootEle, 'descope-totp-image', image);
};

export const setNOTPVariable = (rootEle: HTMLElement, image?: string) => {
  setImageVariable(rootEle, 'descope-notp-image', image);
};

export const setPhoneAutoDetectDefaultCode = (
  fragment: DocumentFragment,
  autoDetectCode?: string,
) => {
  Array.from(
    fragment.querySelectorAll('descope-phone-field[default-code="autoDetect"]'),
  ).forEach((phoneEle) => {
    phoneEle.setAttribute('default-code', autoDetectCode);
  });
};

export const disableWebauthnButtons = (fragment: DocumentFragment) => {
  const webauthnButtons = fragment.querySelectorAll(
    `descope-button[${ELEMENT_TYPE_ATTRIBUTE}="biometrics"]`,
  );
  webauthnButtons.forEach((button) => button.setAttribute('disabled', 'true'));
};

export const getDescopeUiComponentsList = (clone: DocumentFragment) => [
  ...Array.from(clone.querySelectorAll('*')).reduce<Set<string>>(
    (acc, el: HTMLElement) =>
      el.tagName.startsWith('DESCOPE-')
        ? acc.add(el.tagName.toLocaleLowerCase())
        : acc,
    new Set(),
  ),
];
