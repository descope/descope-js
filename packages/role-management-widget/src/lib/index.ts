// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { Unsubscribe } from 'redux'; //  workaround for https://github.com/microsoft/TypeScript/issues/42873
import { RoleManagementWidget } from './widget';

export default RoleManagementWidget;

customElements.define('descope-role-management-widget', RoleManagementWidget);
