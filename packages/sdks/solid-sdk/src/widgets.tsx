import { onMount, onCleanup, Show, type JSX } from 'solid-js';
import { isServer } from 'solid-js/web';
import type {
  WidgetProps,
  UserProfileProps,
  ApplicationsPortalProps,
} from './types';

function createWidgetComponent(tagName: string) {
  return (props: WidgetProps): JSX.Element => {
    let ref: HTMLElement | undefined;

    onMount(async () => {
      if (isServer || !ref) return;

      switch (tagName) {
        case 'descope-user-management-widget':
          await import('@descope/user-management-widget');
          break;
        case 'descope-role-management-widget':
          await import('@descope/role-management-widget');
          break;
        case 'descope-access-key-management-widget':
          await import('@descope/access-key-management-widget');
          break;
        case 'descope-audit-management-widget':
          await import('@descope/audit-management-widget');
          break;
        case 'descope-tenant-profile-widget':
          await import('@descope/tenant-profile-widget');
          break;
        case 'descope-outbound-applications-widget':
          await import('@descope/outbound-applications-widget');
          break;
      }

      const handleReady = (e: Event) => {
        props.onReady?.(e as CustomEvent);
      };

      ref.addEventListener('ready', handleReady);

      onCleanup(() => {
        ref?.removeEventListener('ready', handleReady);
      });
    });

    const Element = tagName as any;

    return (
      <Show when={!isServer} fallback={<div>Loading...</div>}>
        <Element
          ref={ref}
          widget-id={props.widgetId}
          tenant={props.tenant}
          theme={props.theme}
          debug={props.debug}
          style-id={props.styleId}
          logger={props.logger as any}
        />
      </Show>
    );
  };
}

export const UserManagement = createWidgetComponent(
  'descope-user-management-widget',
);

export const RoleManagement = createWidgetComponent(
  'descope-role-management-widget',
);

export const AccessKeyManagement = createWidgetComponent(
  'descope-access-key-management-widget',
);

export const AuditManagement = createWidgetComponent(
  'descope-audit-management-widget',
);

export const TenantProfile = createWidgetComponent(
  'descope-tenant-profile-widget',
);

export const OutboundApplications = createWidgetComponent(
  'descope-outbound-applications-widget',
);

export function UserProfile(props: UserProfileProps): JSX.Element {
  let ref: HTMLElement | undefined;

  onMount(async () => {
    if (isServer || !ref) return;

    await import('@descope/user-profile-widget');

    const handleReady = (e: Event) => {
      props.onReady?.(e as CustomEvent);
    };

    const handleLogout = (e: Event) => {
      props.onLogout?.(e as CustomEvent);
    };

    ref.addEventListener('ready', handleReady);
    ref.addEventListener('logout', handleLogout);

    onCleanup(() => {
      ref?.removeEventListener('ready', handleReady);
      ref?.removeEventListener('logout', handleLogout);
    });
  });

  return (
    <Show when={!isServer} fallback={<div>Loading...</div>}>
      <descope-user-profile-widget
        ref={ref}
        widget-id={props.widgetId}
        theme={props.theme}
        debug={props.debug}
        style-id={props.styleId}
        logger={props.logger as any}
      />
    </Show>
  );
}

export function ApplicationsPortal(
  props: ApplicationsPortalProps,
): JSX.Element {
  let ref: HTMLElement | undefined;

  onMount(async () => {
    if (isServer || !ref) return;

    await import('@descope/applications-portal-widget');

    const handleReady = (e: Event) => {
      props.onReady?.(e as CustomEvent);
    };

    const handleLogout = (e: Event) => {
      props.onLogout?.(e as CustomEvent);
    };

    ref.addEventListener('ready', handleReady);
    ref.addEventListener('logout', handleLogout);

    onCleanup(() => {
      ref?.removeEventListener('ready', handleReady);
      ref?.removeEventListener('logout', handleLogout);
    });
  });

  return (
    <Show when={!isServer} fallback={<div>Loading...</div>}>
      <descope-applications-portal-widget
        ref={ref}
        widget-id={props.widgetId}
        theme={props.theme}
        debug={props.debug}
        style-id={props.styleId}
        logger={props.logger as any}
      />
    </Show>
  );
}
