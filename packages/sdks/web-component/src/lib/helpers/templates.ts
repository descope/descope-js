import { escapeMarkdown } from '@descope/escape-markdown';
import {
  ELEMENT_TYPE_ATTRIBUTE,
  DESCOPE_ATTRIBUTE_EXCLUDE_FIELD,
  HAS_DYNAMIC_VALUES_ATTR_NAME,
} from '../constants';
import { ComponentsConfig, CssVars, ScreenState } from '../types';
import { shouldHandleMarkdown } from './helpers';

const ALLOWED_INPUT_CONFIG_ATTRS = ['disabled'];

export const replaceElementMessage = (
  baseEle: HTMLElement,
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
  handleMarkdown?: boolean,
): string =>
  text.replace(/{{(.+?)}}/g, (_, match) =>
    handleMarkdown
      ? escapeMarkdown(getByPath(screenState, match))
      : getByPath(screenState, match),
  );

/**
 * Replace the templates of content of inner text/link elements with screen state data
 */
const replaceElementTemplates = (
  baseEle: DocumentFragment,
  screenState?: Record<string, any>,
) => {
  const eleList = baseEle.querySelectorAll(
    'descope-text,descope-link,descope-enriched-text,descope-code-snippet',
  );
  eleList.forEach((inEle: HTMLElement) => {
    const handleMarkdown = shouldHandleMarkdown(inEle.localName);
    // eslint-disable-next-line no-param-reassign
    inEle.textContent = applyTemplates(
      inEle.textContent,
      screenState,
      handleMarkdown,
    );
    const href = inEle.getAttribute('href');
    if (href) {
      inEle.setAttribute('href', applyTemplates(href, screenState));
    }
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

const setFormConfigValues = (
  baseEle: DocumentFragment,
  formData: Record<string, string>,
) => {
  Object.entries(formData).forEach(([name, config]) => {
    const eles = baseEle.querySelectorAll(`[name="${name}"]`);

    eles.forEach((ele) => {
      Object.entries(config).forEach(([attrName, attrValue]) => {
        if (ALLOWED_INPUT_CONFIG_ATTRS.includes(attrName)) {
          ele.setAttribute(attrName, attrValue);
        }
      });
    });
  });
};

export const setCssVars = (
  rootEle: HTMLElement,
  nextPageTemplate: DocumentFragment,
  cssVars: CssVars,
  logger: {
    error: (message: string, description: string) => void;
    info: (message: string, description: string) => void;
    debug: (message: string, description: string) => void;
  },
) => {
  if (!cssVars) {
    return;
  }

  Object.keys(cssVars).forEach((componentName) => {
    if (!nextPageTemplate.querySelector(componentName)) {
      logger.debug(
        `Skipping css vars for component "${componentName}"`,
        `Got css vars for component ${componentName} but Could not find it on next page`,
      );

      return;
    }
    const componentClass:
      | (CustomElementConstructor & { cssVarList: CssVars })
      | undefined = customElements.get(componentName) as any;

    if (!componentClass) {
      logger.debug(
        `Could not find component class for ${componentName}`,
        'Check if the component is registered',
      );

      return;
    }

    Object.keys(cssVars[componentName]).forEach((cssVarKey) => {
      const componentCssVars = cssVars[componentName];
      const varName = componentClass?.cssVarList?.[cssVarKey];

      if (!varName) {
        logger.info(
          `Could not find css variable name for ${cssVarKey} in ${componentName}`,
          'Check if the css variable is defined in the component',
        );
        return;
      }

      const value = componentCssVars[cssVarKey];

      rootEle.style.setProperty(varName, value);
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
  const { componentsDynamicAttrs, ...rest } = componentsConfig;

  const configMap = Object.keys(rest).reduce((acc, componentName) => {
    acc[`[name=${componentName}]`] = rest[componentName];
    return acc;
  }, {});

  if (componentsDynamicAttrs) {
    Object.keys(componentsDynamicAttrs).forEach((componentSelector) => {
      const componentDynamicAttrs = componentsDynamicAttrs[componentSelector];
      if (componentDynamicAttrs) {
        const { attributes } = componentDynamicAttrs;
        if (attributes && Object.keys(attributes).length) {
          configMap[componentSelector] = attributes;
        }
      }
    });
  }

  // collect components that needs configuration from DOM
  Object.keys(configMap).forEach((componentsSelector) => {
    baseEle.querySelectorAll(componentsSelector).forEach((comp) => {
      const config = configMap[componentsSelector];

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

const applyComponentsState = (
  baseEle: DocumentFragment,
  componentsState: Record<string, string> = {},
  logger?: { error: (message: string, description: string) => void },
) => {
  Object.entries(componentsState).forEach(([componentId, state]) => {
    const componentEls = baseEle.querySelectorAll(`[id="${CSS.escape(componentId)}"]`);
    componentEls.forEach((compEl) => {
      switch (state) {
        case 'disable':
          compEl.setAttribute('disabled', 'true');
          break;
        case 'hide':
          compEl.classList.add('hidden');
          break;
        default:
          logger?.error(
            `Unknown component state "${state}" for component with id "${componentId}"`,
            'Valid states are "disable" and "hide"',
          );
          break;
      }
    });
  });
};

/**
 * Update a screen template based on the screen state
 *  - Show/hide error messages
 *  - Replace element templates ({{...}} syntax) with screen state object
 */
export const updateTemplateFromScreenState = (
  baseEle: DocumentFragment,
  screenState?: ScreenState,
  flowInputs?: Record<string, string>,
  logger?: { error: (message: string, description: string) => void },
) => {
  replaceHrefByDataType(baseEle, 'totp-link', screenState?.totp?.provisionUrl);
  replaceHrefByDataType(baseEle, 'notp-link', screenState?.notp?.redirectUrl);
  replaceElementTemplates(baseEle, screenState);
  setElementConfig(baseEle, screenState?.componentsConfig, logger);
  replaceTemplateDynamicAttrValues(baseEle, screenState);
  setFormConfigValues(baseEle, flowInputs);
  applyComponentsState(baseEle, screenState?.componentsState, logger);
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
  Array.from(fragment.querySelectorAll('[default-code="autoDetect"]')).forEach(
    (phoneEle) => {
      phoneEle.setAttribute('default-code', autoDetectCode);
    },
  );
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
