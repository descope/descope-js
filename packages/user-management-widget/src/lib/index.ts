import { UserManagementWidget } from './widget';

customElements.define(
  'user-management-widget',
  UserManagementWidget,
);


// get custom attributes and show it in the table
// add sorting capability
// edit user? yael
// displayed vs total num of users
// in case total > displayed, we should fetch users from the server for sort & filter
// data & header in the table should use text component
