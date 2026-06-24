import { createTemplate } from './dom';
import { isPlainObject, kebabCase } from './generic';

export type FlowConfig = {
  projectId: string;
  flowId: string;
  baseUrl?: string;
  baseStaticUrl?: string;
  baseCdnUrl?: string;
  refreshCookieName?: string;
  theme?: string;
  'style-id'?: string;
  locale?: string;
  // flow inputs - objects are JSON-stringified, strings pass through
  form?: Record<string, any> | string;
  client?: Record<string, any> | string;
  // widget-specific context
  tenant?: string;
  outboundAppId?: string;
};

const stringifyValue = (value: unknown) => {
  if (typeof value === 'string') return value;
  if (isPlainObject(value)) return JSON.stringify(value);
  return '';
};

/**
 * Builds a `<descope-wc>` flow template, mapping each config entry to a
 * kebab-cased attribute. Object values (e.g. `client` / `form` flow inputs) are
 * JSON-stringified; strings pass through. Shared by all widgets so a single
 * place controls how widget flows are started.
 */
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
