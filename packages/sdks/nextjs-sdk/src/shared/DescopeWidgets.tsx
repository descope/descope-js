'use client';

// eslint-disable-next-line
import type * as _1 from '@descope/react-sdk/node_modules/@types/react';

import { ComponentType } from 'react';
import dynamic from 'next/dynamic';
import {
	UserManagement as UserManagementWC,
	RoleManagement as RoleManagementWC,
	AccessKeyManagement as AccessKeyManagementWC,
	AuditManagement as AuditManagementWC,
	UserProfile as UserProfileWc,
	ApplicationsPortal as ApplicationsPortalWc,
	TenantProfile as TenantProfileWC
} from '@descope/react-sdk';

// a helper function to dynamically load the components
// This function prevents Next.js from trying to server-side render these components
// Update the helper function to use generics for preserving component prop types
const dynamicWidgetComponent = <P extends {}>(Component: ComponentType<P>) =>
	dynamic<P>(() => Promise.resolve(Component), {
		ssr: false // Disable server-side rendering for this component
	});

// Use the helper function to create dynamically loaded components
export const UserManagement = dynamicWidgetComponent(UserManagementWC);
export const RoleManagement = dynamicWidgetComponent(RoleManagementWC);
export const AccessKeyManagement = dynamicWidgetComponent(
	AccessKeyManagementWC
);
export const AuditManagement = dynamicWidgetComponent(AuditManagementWC);
export const UserProfile = dynamicWidgetComponent(UserProfileWc);
export const ApplicationsPortal = dynamicWidgetComponent(ApplicationsPortalWc);
export const TenantProfile = dynamicWidgetComponent(TenantProfileWc);
