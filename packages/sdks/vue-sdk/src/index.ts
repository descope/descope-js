export { default as Descope } from './Descope.vue';
export { default as UserManagement } from './UserManagement.vue';
export { default as RoleManagement } from './RoleManagement.vue';
export { default as AccessKeyManagement } from './AccessKeyManagement.vue';
export { default as AuditManagement } from './AuditManagement.vue';
export { default as UserProfile } from './UserProfile.vue';
export { default as ApplicationsPortal } from './ApplicationsPortal.vue';
export { useDescope, useSession, useUser } from './hooks';
export { default, routeGuard, getSdk } from './plugin';
export {
  getJwtPermissions,
  getJwtRoles,
  getRefreshToken,
  getSessionToken,
  isSessionTokenExpired,
  isRefreshTokenExpired,
  getCurrentTenant,
} from './sdk';
