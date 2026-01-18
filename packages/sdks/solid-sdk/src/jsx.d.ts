import 'solid-js';

declare module 'solid-js' {
  namespace JSX {
    interface IntrinsicElements {
      'descope-wc': any;
      'descope-user-management-widget': any;
      'descope-role-management-widget': any;
      'descope-access-key-management-widget': any;
      'descope-audit-management-widget': any;
      'descope-user-profile-widget': any;
      'descope-applications-portal-widget': any;
      'descope-outbound-applications-widget': any;
      'descope-tenant-profile-widget': any;
    }
  }
}
