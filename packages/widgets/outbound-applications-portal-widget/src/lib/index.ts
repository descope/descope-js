// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { Unsubscribe } from 'redux'; //  workaround for https://github.com/microsoft/TypeScript/issues/42873
import { ApplicationsPortalWidget } from './widget';

export default ApplicationsPortalWidget;

customElements.define(
  // TODO: [outbound-applications-portal-widget] Change widget name
  'descope-applications-portal-widget',
  ApplicationsPortalWidget,
);
