export const setupScript = (id: string) => {
  const scriptEle = document.createElement('script');
  scriptEle.id = id;

  return scriptEle;
};

export const getDescopeUiComponentsList = (template: HTMLTemplateElement) => [
  ...Array.from(template.content.querySelectorAll('*')).reduce<Set<string>>(
    (acc, el: Element) =>
      el.localName.startsWith('descope-') ? acc.add(el.localName) : acc,
    new Set(),
  ),
];
