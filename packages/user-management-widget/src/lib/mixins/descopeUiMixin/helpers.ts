import { UI_COMPONENTS_URL_VERSION_PLACEHOLDER } from './constants';

export const setupScript = (id: string) => {
  const scriptEle = document.createElement('script');
  scriptEle.id = id;

  return scriptEle;
};

export const generateScriptUrl = (
  urlTemplate: string,
  componentsVersion: string,
) =>
  urlTemplate.replace(UI_COMPONENTS_URL_VERSION_PLACEHOLDER, componentsVersion);

export const getDescopeUiComponentsList = (clone: DocumentFragment) => [
  ...Array.from(clone.querySelectorAll('*')).reduce<Set<string>>(
    (acc, el: HTMLElement) =>
      el.localName.startsWith('descope-') ? acc.add(el.localName) : acc,
    new Set(),
  ),
];
