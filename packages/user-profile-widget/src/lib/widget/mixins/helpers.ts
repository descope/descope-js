import { createTemplate, kebabCase } from '@descope/sdk-helpers';

type FlowConfig = {
  projectId: string;
  flowId: string;
  baseUrl?: string;
};
export const createFlowTemplate = (
  flowConfig: FlowConfig = {} as FlowConfig,
  mock?: boolean,
) => {
  if (mock) {
    return createTemplate(`
      <div style="height: 100px;">
        <div style="font-weight: 800; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${flowConfig.flowId}">
          Flow ID: ${flowConfig.flowId}
        </div>
        <div style="margin-top: 12px;">
          Experiencing full widget's functionality requires embedding it in your application.
        </div>
      </div>
    `);
  }

  const template = createTemplate(`<descope-wc></descope-wc>`);
  Object.entries(flowConfig).forEach(([key, value]) => {
    template.content
      .querySelector('descope-wc')
      .setAttribute(kebabCase(key), value);
  });

  return template;
};
