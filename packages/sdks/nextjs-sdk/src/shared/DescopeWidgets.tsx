'use client';

/* eslint-disable import/exports-last, prefer-arrow/prefer-arrow-functions */

import React from 'react';
import dynamic from 'next/dynamic';
import type {
	UserManagement as UserManagementWC,
	RoleManagement as RoleManagementWC,
	AccessKeyManagement as AccessKeyManagementWC,
	AuditManagement as AuditManagementWC,
	UserProfile as UserProfileWC,
	ApplicationsPortal as ApplicationsPortalWC,
	TenantProfile as TenantProfileWC,
	OutboundApplications as OutboundApplicationsWC
} from '@descope/react-sdk';

export type UserManagementProps = React.ComponentProps<typeof UserManagementWC>;
export type RoleManagementProps = React.ComponentProps<typeof RoleManagementWC>;
export type AccessKeyManagementProps = React.ComponentProps<
	typeof AccessKeyManagementWC
>;
export type AuditManagementProps = React.ComponentProps<
	typeof AuditManagementWC
>;
export type UserProfileProps = React.ComponentProps<typeof UserProfileWC>;
export type ApplicationsPortalProps = React.ComponentProps<
	typeof ApplicationsPortalWC
>;
export type TenantProfileProps = React.ComponentProps<typeof TenantProfileWC>;
export type OutboundApplicationsProps = React.ComponentProps<
	typeof OutboundApplicationsWC
>;

function makeWidget<T extends Record<string, any>>(name: string) {
	return dynamic<T>(
		() =>
			import('@descope/react-sdk').then((mod: any) => {
				const Inner = mod[name] as React.ComponentType<any>;
				const Wrapped = (props: T) => React.createElement(Inner, props);
				(Wrapped as any).displayName = `Descope${name}`;
				return { default: Wrapped };
			}),
		{ ssr: false }
	);
}

export const UserManagement: React.ComponentType<UserManagementProps> =
	makeWidget<UserManagementProps>('UserManagement');
export const RoleManagement: React.ComponentType<RoleManagementProps> =
	makeWidget<RoleManagementProps>('RoleManagement');
export const AccessKeyManagement: React.ComponentType<AccessKeyManagementProps> =
	makeWidget<AccessKeyManagementProps>('AccessKeyManagement');
export const AuditManagement: React.ComponentType<AuditManagementProps> =
	makeWidget<AuditManagementProps>('AuditManagement');
export const UserProfile: React.ComponentType<UserProfileProps> =
	makeWidget<UserProfileProps>('UserProfile');
export const ApplicationsPortal: React.ComponentType<ApplicationsPortalProps> =
	makeWidget<ApplicationsPortalProps>('ApplicationsPortal');
export const TenantProfile: React.ComponentType<TenantProfileProps> =
	makeWidget<TenantProfileProps>('TenantProfile');
export const OutboundApplications: React.ComponentType<OutboundApplicationsProps> =
	makeWidget<OutboundApplicationsProps>('OutboundApplications');
