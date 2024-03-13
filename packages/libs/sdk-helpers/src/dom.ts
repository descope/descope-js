export const createTemplate = (templateString: string) => {
  const template = document.createElement('template');
  template.innerHTML = templateString;

  return template;
};
