/* eslint-disable no-console */
import { NextRequest, NextResponse } from 'next/server';
import descopeSdk from '@descope/node-sdk';
import type { AuthenticationInfo } from '@descope/node-sdk';
import { DEFAULT_PUBLIC_ROUTES, DESCOPE_SESSION_HEADER } from './constants';
import { getGlobalSdk } from './sdk';
import { mergeSearchParams } from './utils';

type MiddlewareOptions = {
	// The Descope project ID to use for authentication
	// Defaults to process.env.DESCOPE_PROJECT_ID
	projectId?: string;

	// The base URL to use for authentication
	// Defaults to process.env.DESCOPE_BASE_URL
	baseUrl?: string;

	// The URL to redirect to if the user is not authenticated
	// Defaults to process.env.SIGN_IN_ROUTE or '/sign-in' if not provided
	// NOTE: In case it contains query parameters that exist in the original URL, they will override the original query parameters. e.g. if the original URL is /page?param1=1&param2=2 and the redirect URL is /sign-in?param1=3, the final redirect URL will be /sign-in?param1=3&param2=2
	redirectUrl?: string;

	// An array of public routes that do not require authentication
	// In addition to the default public routes:
	// - process.env.SIGN_IN_ROUTE or /sign-in if not provided
	// - process.env.SIGN_UP_ROUTE or /sign-up if not provided
	publicRoutes?: string[];
};

const getSessionJwt = (req: NextRequest): string | undefined => {
	let jwt = req.headers?.get('Authorization')?.split(' ')[1];
	if (jwt) {
		return jwt;
	}

	jwt = req.cookies?.get(descopeSdk.SessionTokenCookieName)?.value;
	if (jwt) {
		return jwt;
	}
	return undefined;
};

const isPublicRoute = (req: NextRequest, options: MiddlewareOptions) => {
	const isDefaultPublicRoute = Object.values(DEFAULT_PUBLIC_ROUTES).includes(
		req.nextUrl.pathname
	);
	const isPublic = options.publicRoutes?.includes(req.nextUrl.pathname);

	return isDefaultPublicRoute || isPublic;
};

const addSessionToHeadersIfExists = (
	headers: Headers,
	session: AuthenticationInfo | undefined
): Headers => {
	if (session) {
		const requestHeaders = new Headers(headers);
		requestHeaders.set(
			DESCOPE_SESSION_HEADER,
			Buffer.from(JSON.stringify(session)).toString('base64')
		);
		return requestHeaders;
	}
	return headers;
};

// returns a Middleware that checks if the user is authenticated
// if the user is not authenticated, it redirects to the redirectUrl
// if the user is authenticated, it adds the session to the headers
const createAuthMiddleware =
	(options: MiddlewareOptions = {}) =>
	async (req: NextRequest) => {
		console.debug('Auth middleware starts');

		const jwt = getSessionJwt(req);

		// check if the user is authenticated
		let session: AuthenticationInfo | undefined;
		try {
			session = await getGlobalSdk({
				projectId: options.projectId,
				baseUrl: options.baseUrl
			}).validateJwt(jwt);
		} catch (err) {
			console.debug('Auth middleware, Failed to validate JWT', err);
			if (!isPublicRoute(req, options)) {
				const redirectUrl = options.redirectUrl || DEFAULT_PUBLIC_ROUTES.signIn;
				const url = req.nextUrl.clone();
				// Create a URL object for redirectUrl. 'http://example.com' is just a placeholder.
				const parsedRedirectUrl = new URL(redirectUrl, 'http://example.com');
				url.pathname = parsedRedirectUrl.pathname;

				const searchParams = mergeSearchParams(
					url.search,
					parsedRedirectUrl.search
				);
				if (searchParams) {
					url.search = searchParams;
				}
				console.debug(`Auth middleware, Redirecting to ${redirectUrl}`);
				return NextResponse.redirect(url);
			}
		}

		console.debug('Auth middleware finishes');
		// add the session to the request, if it exists
		const headers = addSessionToHeadersIfExists(req.headers, session);
		return NextResponse.next({
			request: {
				headers
			}
		});
	};

export default createAuthMiddleware;
