import { generatePortFromWidgetName } from '@descope/e2e-helpers';

export const widgetName = 'outbound-applications-portal-widget';
export const componentsPort = generatePortFromWidgetName(
  'outbound-applications-portal-widget-components',
);
export const widgetPort = generatePortFromWidgetName(widgetName);
