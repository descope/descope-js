import { createTemplate, kebabCase } from '@descope/sdk-helpers';

type FlowConfig = {
  projectId: string;
  flowId: string;
  baseUrl?: string;
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
