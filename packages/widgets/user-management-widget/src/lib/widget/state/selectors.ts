import { createSelector } from 'reselect';
import { flatten, formatCustomAttrValue } from '../../helpers';
import { State } from './types';
import { userStatusMappings, MULTIPLE_ROLES_LABEL } from './constants';

export const getRawUsersList = (state: State) => state.usersList.data;
export const getTenantRoles = (state: State) => state.tenantRoles.data;
export const getSubTenantRoles = (state: State) => state.subTenantRoles.data;
export const getSelectedUsersLoginIds = (state: State) =>
  state.selectedUsersLoginIds;
export const getNotifications = (state: State) => state.notifications;
export const getSearchParams = (state: State) => state.searchParams;
export const getCustomAttributes = (state: State) =>
  state.customAttributes.data;

export const getSubTenantRolesData = createSelector(
  getSubTenantRoles,
  (subTenantRoles) =>
    Object.fromEntries(
      subTenantRoles.map(({ tenantId, tenantName, roleNames }) => [
        tenantId,
        tenantName ? { label: tenantName, options: roleNames } : roleNames,
      ]),
    ),
);

export const getCustomAttrTypes = createSelector(
  getCustomAttributes,
  (customAttrs) =>
    Object.fromEntries(customAttrs.map((attr) => [attr.name, attr.type])),
);

export const getFormattedUserList = createSelector(
  getRawUsersList,
  getCustomAttrTypes,
  (users, customAttrTypes) =>
    users.map((user) => ({
      ...user,
      ...{
        customAttributes: Object.fromEntries(
          Object.entries(user.customAttributes || {}).map(([attr, val]) => [
            attr,
            formatCustomAttrValue(customAttrTypes[attr], val),
          ]),
        ),
      },
    })),
);

const getRolesDisplay = (user: {
  roleNames?: string[];
  userTenants?: { roleNames?: string[] }[];
}): string[] | string => {
  const allRoleSets = [
    user.roleNames || [],
    ...(user.userTenants || []).map((t) => t.roleNames || []),
  ];
  const sorted = allRoleSets.map((roles) => [...roles].sort().join('\0'));
  const allSame = sorted.every((s) => s === sorted[0]);
  return allSame ? user.roleNames || [] : MULTIPLE_ROLES_LABEL;
};

export const getUsersList = createSelector(getFormattedUserList, (users) =>
  users.map((user) => ({
    ...user,
    ...flatten(user?.customAttributes, 'customAttributes'),
    createdTimeFormatted: new Date(
      (user?.createdTime || 0) * 1000,
    ).toLocaleString(),
    status: userStatusMappings[user.status] || user.status,
    roles: getRolesDisplay(user),
    tenants: user.userTenants?.map(
      (tenant) => tenant.tenantName || tenant.tenantId,
    ),
  })),
);

export const getSelectedUsers = createSelector(
  getSelectedUsersLoginIds,
  getUsersList,
  (selected, users) => users.filter((user) => selected.includes(user.loginIds)),
);

export const getSelectedUsersUserIds = createSelector(
  getSelectedUsers,
  (users) => users.map((user) => user.userId),
);
export const getSelectedUsersAllIds = createSelector(
  getSelectedUsers,
  (users) =>
    users.map(({ userId, loginIds }) => ({
      userId,
      loginIds,
    })),
);
export const getSelectedUsersRolesList = createSelector(
  getSelectedUsers,
  (users) =>
    users.map((user) => ({
      userId: user.userId,
      roles: user.roles,
    })),
);

export const getSelectedUsersStatus = createSelector(
  getSelectedUsers,
  (users) => users.map((user) => user.status),
);

export const getIsSelectedUsersEditable = createSelector(
  getSelectedUsers,
  (selectedUsers) => selectedUsers.every((user) => user.editable),
);

export const getIsUsersSelected = createSelector(
  getSelectedUsersLoginIds,
  (selected) => !!selected.length,
);

export const getIsSingleUsersSelected = createSelector(
  getSelectedUsersLoginIds,
  (selected) => selected.length === 1,
);

export const getSelectedUserLoginId = createSelector(
  getSelectedUsersLoginIds,
  (loginIds) => loginIds?.[0]?.[0] as string,
);

export const getIsSelectedUsersEnabled = createSelector(
  getIsSingleUsersSelected,
  getSelectedUsersStatus,
  (isSingleUser, statuses) =>
    isSingleUser &&
    statuses.every((status) => status === userStatusMappings.enabled),
);

export const getIsSelectedUsersDisabled = createSelector(
  getSelectedUsersStatus,
  (statuses) =>
    statuses.every((status) => status === userStatusMappings.disabled),
);

export const getSelectedUsersDetailsForDisplay = createSelector(
  getSelectedUsers,
  (selectedUsers) => {
    if (selectedUsers.length === 1) {
      return (
        selectedUsers[0].name ||
        selectedUsers[0].email ||
        selectedUsers[0].loginIds?.[0]
      );
    }
    return `${selectedUsers.length} users`;
  },
);

export const getCanEnable = createSelector(
  getIsSingleUsersSelected,
  getIsSelectedUsersDisabled,
  getIsSelectedUsersEditable,
  (isSingleUser, isUsersDisabled, isUsersEditable) =>
    isSingleUser && isUsersDisabled && isUsersEditable,
);

export const getCanDisable = createSelector(
  getIsSingleUsersSelected,
  getIsSelectedUsersEnabled,
  getIsSelectedUsersEditable,
  (isSingleUser, isUsersEnabled, isUsersEditable) =>
    isSingleUser && isUsersEnabled && isUsersEditable,
);

export const getCanEdit = createSelector(
  getIsSingleUsersSelected,
  getIsSelectedUsersEditable,
  (isSingleUser, isUsersEditable) => isSingleUser && isUsersEditable,
);

export const getCanRemovePasskey = createSelector(
  getIsSingleUsersSelected,
  getIsSelectedUsersEditable,
  (isSingleUser, isUsersEditable) => isSingleUser && isUsersEditable,
);

export const getCanResetPassword = createSelector(
  getIsSingleUsersSelected,
  getIsSelectedUsersEditable,
  (isSingleUser, isUsersEditable) => isSingleUser && isUsersEditable,
);

export const getCanDelete = getIsUsersSelected;

export const getEnableOneOrMore = getIsUsersSelected;
export const getEnableOnlyOne = getIsSingleUsersSelected;
