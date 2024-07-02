import { createTemplate, kebabCase } from '@descope/sdk-helpers';

type FlowConfig = {
  projectId: string;
  flowId: string;
  baseUrl?: string;
  baseStaticUrl?: string;
};

export const createFlowTemplate = (
  flowConfig: FlowConfig = {} as FlowConfig,
) => {
  const template = createTemplate(`<descope-wc></descope-wc>`);

  Object.entries(flowConfig).forEach(([key, value]) => {
    template.content
      .querySelector('descope-wc')
      .setAttribute(kebabCase(key), value);
  });

  return template;
};

export function getUrlParam(paramName: string) {
  const urlParams = new URLSearchParams(window.location.search);

  return urlParams.get(paramName);
}

export function resetUrlParam(paramName: string) {
  if (window.history.replaceState && getUrlParam(paramName)) {
    const newUrl = new URL(window.location.href);
    const search = new URLSearchParams(newUrl.search);
    search.delete(paramName);
    newUrl.search = search.toString();
    window.history.replaceState({}, '', newUrl.toString());
  }
}
