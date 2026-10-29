export const attributesObserver = (
  ele: HTMLElement,
  callback: (attrName: string) => void,
) => {
  // sync all attrs on init
  Array.from(ele.attributes).forEach((attr) => callback(attr.name));

  const observer = new MutationObserver((mutationsList) => {
    mutationsList.forEach((mutation) => {
      // setAttribute with the current value still emits a mutation, skip it
      if (
        mutation.type === 'attributes' &&
        mutation.oldValue !== ele.getAttribute(mutation.attributeName)
      ) {
        callback(mutation.attributeName);
      }
    });
  });

  observer.observe(ele, { attributes: true, attributeOldValue: true });
};
