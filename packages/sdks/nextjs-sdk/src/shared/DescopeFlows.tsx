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

type WithRedirect<T> = T & RedirectAddon;

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
				const Wrapped: React.FC<WithRedirect<T>> = ({
					redirectAfterSuccess = '',
					redirectAfterError = '',
					...rest
				}) => {
					const router = useRouter();
					// we purposefully allow index access because we don't know exact handler names ahead; use a mutable copy
					const forwarded = { ...rest } as T;
					if (redirectAfterSuccess) {
						const original = forwarded.onSuccess as
							| ((...a: any[]) => void)
							| undefined;
						forwarded.onSuccess = (...args: any[]) => {
							original?.(...args);
							router.push(redirectAfterSuccess);
						};
					}
					if (redirectAfterError) {
						const original = forwarded.onError as
							| ((...a: any[]) => void)
							| undefined;
						forwarded.onError = (...args: any[]) => {
							original?.(...args);
							router.push(redirectAfterError);
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
