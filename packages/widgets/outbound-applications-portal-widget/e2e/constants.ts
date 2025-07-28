import { generatePortFromName } from '@descope/e2e-helpers';

export const widgetName = 'outbound-applications-portal-widget';
export const componentsPort = generatePortFromName(
  'outbound-applications-portal-widget-components',
);
export const widgetPort = generatePortFromName(widgetName);
