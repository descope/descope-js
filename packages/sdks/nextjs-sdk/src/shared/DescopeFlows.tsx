'use client';

/* eslint-disable import/exports-last, prefer-arrow/prefer-arrow-functions */

import React from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import type {
	Descope as DescopeWC,
	SignInFlow as SignInFlowWC,
	SignUpFlow as SignUpFlowWC,
	SignUpOrInFlow as SignUpOrInFlowWC
} from '@descope/react-sdk';
import { baseHeaders as nextBaseHeaders } from './constants';

interface RedirectAddon {
	redirectAfterSuccess?: string;
	redirectAfterError?: string;
}

export type BaseDescopeProps = React.ComponentProps<typeof DescopeWC>;
export type BaseSignInFlowProps = React.ComponentProps<typeof SignInFlowWC>;
export type BaseSignUpFlowProps = React.ComponentProps<typeof SignUpFlowWC>;
export type BaseSignUpOrInFlowProps = React.ComponentProps<
	typeof SignUpOrInFlowWC
>;

export interface DescopeProps extends BaseDescopeProps, RedirectAddon {}
export interface SignInFlowProps extends BaseSignInFlowProps, RedirectAddon {}
export interface SignUpFlowProps extends BaseSignUpFlowProps, RedirectAddon {}
export interface SignUpOrInFlowProps
	extends BaseSignUpOrInFlowProps,
		RedirectAddon {}

type AnyFlowProps =
	| DescopeProps
	| SignInFlowProps
	| SignUpFlowProps
	| SignUpOrInFlowProps;
/**
 * Dynamically loads the underlying Descope React component and wraps it with optional
 * redirect handling (redirectAfterSuccess / redirectAfterError). SSR is disabled.
 * The returned component preserves the original SDK prop surface plus redirect props.
 */
function createDescopeWrapper<T extends AnyFlowProps>(
	componentName: string
): React.ComponentType<T> {
	return dynamic<T>(
		() =>
			import('@descope/react-sdk').then((mod: any) => {
				if (mod.baseHeaders) Object.assign(mod.baseHeaders, nextBaseHeaders);
				const Inner = mod[componentName] as React.ComponentType<any>;
				const Wrapped = ({
					redirectAfterSuccess = '',
					redirectAfterError = '',
					...rest
				}: any) => {
					const router = useRouter();
					const forwarded: any = { ...rest };
					if (redirectAfterSuccess) {
						const original = forwarded.onSuccess;
						forwarded.onSuccess = (...args: any[]) => {
							original?.(...args);
							router.push(redirectAfterSuccess as string);
						};
					}
					if (redirectAfterError) {
						const original = forwarded.onError;
						forwarded.onError = (...args: any[]) => {
							original?.(...args);
							router.push(redirectAfterError as string);
						};
					}
					return React.createElement(Inner, forwarded);
				};
				(Wrapped as any).displayName = `Descope${componentName}`;
				return { default: Wrapped };
			}),
		{ ssr: false }
	);
}

export const Descope = createDescopeWrapper<DescopeProps>('Descope');
export const SignInFlow = createDescopeWrapper<SignInFlowProps>('SignInFlow');
export const SignUpFlow = createDescopeWrapper<SignUpFlowProps>('SignUpFlow');
export const SignUpOrInFlow =
	createDescopeWrapper<SignUpOrInFlowProps>('SignUpOrInFlow');
