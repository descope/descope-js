export const attributesObserver = (
  ele: HTMLElement,
  callback: (attrName: string) => void,
) => {
  // sync all attrs on init
  Array.from(ele.attributes).forEach((attr) => callback(attr.name));

  const observer = new MutationObserver((mutationsList) => {
    mutationsList.forEach((mutation) => {
      if (mutation.type === 'attributes') {
        callback(mutation.attributeName);
      }
    });
  });

  observer.observe(ele, { attributes: true });
};
