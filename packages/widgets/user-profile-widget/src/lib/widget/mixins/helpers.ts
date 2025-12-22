import { createTemplate, isPlainObject, kebabCase } from '@descope/sdk-helpers';

type FlowConfig = {
  projectId: string;
  flowId: string;
  baseUrl?: string;
  baseStaticUrl?: string;
  baseCdnUrl?: string;
  refreshCookieName?: string;
  theme?: string;
  'style-id'?: string;
  form?: Record<string, string>;
};

const stringifyValue = (value: unknown) => {
  if (typeof value === 'string') return value;
  if (isPlainObject(value)) return JSON.stringify(value);
  return '';
};

export const createFlowTemplate = (
  flowConfig: FlowConfig = {} as FlowConfig,
) => {
  const template = createTemplate(`<descope-wc></descope-wc>`);

  Object.entries(flowConfig).forEach(([key, value]) => {
    template.content
      .querySelector('descope-wc')
      .setAttribute(kebabCase(key), stringifyValue(value));
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
