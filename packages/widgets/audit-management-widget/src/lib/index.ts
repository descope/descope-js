// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { Unsubscribe } from 'redux'; //  workaround for https://github.com/microsoft/TypeScript/issues/42873
import { AuditManagementWidget } from './widget';

export default AuditManagementWidget;

customElements.define('descope-audit-management-widget', AuditManagementWidget);
